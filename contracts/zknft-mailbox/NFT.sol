// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusMailbox, MailboxMessage} from "nexus/interfaces/INexusMailbox.sol";
import "forge-std/console.sol";
import {LockNFT, PendingPayment} from "./types.sol";

contract MyNFTMailbox is ERC721 {
    INexusMailbox public mailbox;
    bytes32 immutable selfNexusId;
    bytes32 immutable paymentNexusId;
    address paymentContractAddress;
    uint256 constant TIMEOUT_BLOCKS = 10;

    mapping(bytes32 => LockNFT) lockNFTMap;

    event Confirmation(uint256 tokenId, address to);
    event LockHash(bytes32 lockHash);

    error InvalidSender();
    error TransferAlreadyCompleted();
    error CannotWithdrawBeforeTimeout();
    error InvalidChain();

    uint256 nonce = 0;

    constructor(
        bytes32 _selfNexusId,
        bytes32 _paymentNexusId,
        INexusMailbox _mailbox
    ) ERC721("MyNFT", "MNFT") {
        mailbox = _mailbox;
        selfNexusId = _selfNexusId;
        paymentNexusId = _paymentNexusId;
    }

    // TODO: make only owner
    function setNftPaymentContractAddress(
        address _paymentContractAddress
    ) public {
        paymentContractAddress = _paymentContractAddress;
    }

    function lockNFT(
        uint256 tokenId,
        uint256 amount,
        address tokenAddress
    ) public {
        LockNFT memory lockNft = LockNFT({
            from: msg.sender,
            nftId: tokenId,
            amount: amount,
            tokenAddress: tokenAddress,
            blockNumber: block.number,
            nonce: ++nonce
        });
        bytes memory data = abi.encode(lockNft);
        lockNFTMap[keccak256(data)] = lockNft;
        transferFrom(msg.sender, address(this), tokenId);
        emit LockHash(keccak256(data));
    }

    function transferNFT(
        uint256 chainBlockNumber,
        MailboxMessage calldata mailboxReceipt,
        bytes calldata proof
    ) public {
        mailbox.receiveMessage(chainBlockNumber, mailboxReceipt, proof);
    }

    function onNexusMessage(
        bytes32 nexusAppIdFrom,
        address sender,
        bytes memory data
    ) public {
        if (nexusAppIdFrom != paymentNexusId) {
            revert InvalidChain();
        }
        if (sender != paymentContractAddress) {
            revert InvalidSender();
        }
        PendingPayment memory pendingPaymentInfo = abi.decode(
            data,
            (PendingPayment)
        );

        // mint to the person who transfered the payment
        _transfer(
            address(this),
            pendingPaymentInfo.to,
            pendingPaymentInfo.nftId
        );

        emit Confirmation(pendingPaymentInfo.nftId, pendingPaymentInfo.to);
    }

    function withdrawNFT(bytes32 lockHash, bytes calldata proof) public {
        LockNFT memory lock = lockNFTMap[lockHash];
        if (lock.blockNumber + TIMEOUT_BLOCKS < block.number) {
            revert CannotWithdrawBeforeTimeout();
        }
        if (lock.from != msg.sender) {
            revert InvalidSender();
        }
        if (ownerOf(lock.nftId) == address(this)) {
            revert TransferAlreadyCompleted();
        }
        bytes32[] memory nexusIdTo = new bytes32[](1);
        nexusIdTo[0] = selfNexusId;
        address[] memory to = new address[](1);
        to[0] = address(this);
        PendingPayment memory payment = PendingPayment({
            nftId: lock.nftId,
            to: lock.from,
            amount: lock.amount,
            tokenAddress: lock.tokenAddress
        });

        bytes memory data = abi.encode(payment);

        MailboxMessage memory receipt = MailboxMessage({
            nexusAppIdFrom: paymentNexusId,
            nexusAppIdTo: nexusIdTo,
            data: data,
            from: paymentContractAddress,
            to: to,
            nonce: lock.nonce
        });

        // if the message verfication fails => no payment is done
        (bool success, ) = address(mailbox).call(
            abi.encodeWithSignature(
                "receiveMessage(uint256, bytes, bytes)",
                0, // zk sync verifier doesn't require the block number
                receipt,
                proof
            )
        );

        // implies the verification failed
        if (!success) {
            transferFrom(msg.sender, address(this), lock.nftId);
            delete lockNFTMap[lockHash];
        }
    }

    function mint(uint256 tokenId) public {
        _mint(msg.sender, tokenId);
    }
}
