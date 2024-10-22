// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusMailbox, MailboxMessage} from "nexus/interfaces/INexusMailbox.sol";
import "forge-std/console.sol";
import {LockedNFT, PaymentReceipt} from "./types.sol";

contract MyNFTMailbox is ERC721 {
    INexusMailbox public mailbox;
    bytes32 immutable selfNexusId;
    bytes32 immutable paymentNexusId;
    address paymentContractAddress;
    uint256 constant TIMEOUT_BLOCKS = 10;

    mapping(uint256 => LockedNFT) lockedNFTs;

    event Confirmation(uint256 tokenId, address to);

    error InvalidSender();
    error TransferAlreadyCompleted();
    error CannotWithdrawBeforeTimeout();
    error InvalidChain();

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
        uint256 nonce,
        address tokenAddress,
        address paymentReceiver,
        address paymentFrom,
        address nftReceiver
    ) public {
        if (lockedNFTs[tokenId].nftId != 0) {
            revert("NFT is already locked");
        }

        LockedNFT memory lockedNFT = LockedNFT({
            from: msg.sender,
            nftId: tokenId,
            amount: amount,
            tokenAddress: tokenAddress,
            blockNumber: block.number,
            nonce: nonce,
            paymentReceiver: paymentReceiver,
            paymentFrom: paymentFrom,
            nftReceiver: nftReceiver
        });

        lockedNFTs[tokenId] = lockedNFT;

        transferFrom(msg.sender, address(this), tokenId);
    }

    function transferNFT(
        uint256 chainBlockNumber,
        MailboxMessage calldata mailboxReceipt,
        bytes calldata proof
    ) public {
        mailbox.receiveMessage(chainBlockNumber, mailboxReceipt, proof);
    }

    function onNexusMessage(
        bytes32 nexusAppIDFrom,
        address sender,
        bytes memory data,
        uint256 nonce
    ) public {
        // Check if the nexusAppIDFrom matches the expected paymentNexusId
        if (nexusAppIDFrom != paymentNexusId) {
            revert InvalidChain();
        }

        // Check if the sender matches the expected paymentContractAddress
        if (sender != paymentContractAddress) {
            revert InvalidSender();
        }

        PaymentReceipt memory paymentReceipt = abi.decode(
            data,
            (PaymentReceipt)
        );

        // Retrieve the corresponding LockedNFT using the nftId from the PaymentReceipt
        LockedNFT memory lockedNft = lockedNFTs[paymentReceipt.nftId];

        // Check if the nonce matches
        if (nonce != lockedNft.nonce) {
            revert("Nonce mismatch");
        }

        // Reconstruct the PaymentReceipt from the LockedNFT details.
        PaymentReceipt memory expectedPaymentReceipt = PaymentReceipt({
            from: lockedNft.paymentFrom,
            to: lockedNft.paymentReceiver,
            nftId: lockedNft.nftId,
            amount: lockedNft.amount,
            tokenAddress: lockedNft.tokenAddress
        });

        //TODO: Check if hashing is more expensive than equality check of each field.
        if (keccak256(abi.encode(expectedPaymentReceipt)) != keccak256(data)) {
            revert("Payment receipt hash mismatch");
        }

        // Transfer the NFT to the lockedNFT paymentReceiver
        _transfer(address(this), lockedNft.nftReceiver, lockedNft.nftId);

        // Emit confirmation event
        emit Confirmation(lockedNft.nftId, lockedNft.paymentReceiver);

        // Remove the entry from lockedNFTs to clear the record
        delete lockedNFTs[paymentReceipt.nftId];
    }

    function withdrawNFT(uint256 tokenID, bytes calldata proof) public {
        LockedNFT memory lock = lockedNFTs[tokenID];
        //TODO: Discuss whether this should be payment chain block number or nft chain.
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
        PaymentReceipt memory payment = PaymentReceipt({
            from: lock.paymentFrom,
            nftId: lock.nftId,
            to: lock.paymentReceiver,
            amount: lock.amount,
            tokenAddress: lock.tokenAddress
        });

        bytes memory data = abi.encode(payment);

        MailboxMessage memory receipt = MailboxMessage({
            nexusAppIDFrom: paymentNexusId,
            nexusAppIDTo: nexusIdTo,
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
            transferFrom(address(this), lock.from, lock.nftId);
            delete lockedNFTs[tokenID];
        }
    }

    function mint(uint256 tokenId) public {
        _mint(msg.sender, tokenId);
    }
}
