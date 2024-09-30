// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusMailbox, Receipt} from "nexus/interfaces/INexusMailbox.sol";
import "forge-std/console.sol";
import {LockNFT, PendingPayment, ConfirmationReciept, UnLockNFT} from "./types.sol";

contract MyNFT is ERC721 {
    uint256 private _tokenIds;
    INexusMailbox public mailbox;
    bytes32 immutable selfChainId;
    bytes32 immutable paymentChainID;

    mapping(bytes32 => LockNFT) lockNFTMap;

    event Confirmation(uint256 tokenId, address to);

    error InvalidSender();
    error TransferAlreadyCompleted();

    constructor(
        bytes32 _selfChainId,
        bytes32 _paymentChainID,
        INexusMailbox _mailbox
    ) ERC721("MyNFT", "MNFT") {
        mailbox = _mailbox;
        selfChainId = _selfChainId;
        paymentChainID = _paymentChainID;
    }

    function lockNFT(
        uint256 tokenId,
        uint256 amount,
        address tokenAddress
    ) public {
        bytes32[] memory chainIdTo = new bytes32[](1);
        chainIdTo[0] = paymentChainID;
        address[] memory to = new address[](1);
        to[0] = address(0);
        LockNFT memory lockNft = LockNFT({
            from: msg.sender,
            nftId: tokenId,
            amount: amount,
            tokenAddress: tokenAddress
        });
        bytes memory data = abi.encode(lockNft);
        lockNFTMap[keccak256(data)] = lockNft;
        transferFrom(msg.sender, address(this), tokenId);
        mailbox.sendMessage(chainIdTo, to, data);
    }

    function transferNFT(
        uint256 chainBlockNumber,
        Receipt calldata mailboxReceipt,
        bytes calldata proof
    ) public {
        mailbox.receiveMessage(chainBlockNumber, mailboxReceipt, proof, false);

        PendingPayment memory pendingPaymentInfo = abi.decode(
            mailboxReceipt.data,
            (PendingPayment)
        );

        // mint to the person who transfered the payment
        _transfer(
            address(this),
            pendingPaymentInfo.to,
            pendingPaymentInfo.nftId
        );

        ConfirmationReciept memory receipt = ConfirmationReciept(
            pendingPaymentInfo.nftId,
            pendingPaymentInfo.to,
            pendingPaymentInfo.amount,
            pendingPaymentInfo.tokenAddress
        );
        emit Confirmation(pendingPaymentInfo.nftId, pendingPaymentInfo.to);
        bytes32[] memory chainIdTo = new bytes32[](1);
        chainIdTo[0] = paymentChainID;
        address[] memory to = new address[](1);
        to[0] = address(0);
        bytes memory dataNew = abi.encode(receipt);
        mailbox.sendMessage(chainIdTo, to, dataNew); // used furthur to claim payment on payment chain from escrow
    }

    function withdrawNFT(bytes32 lockHash) public {
        LockNFT memory lock = lockNFTMap[lockHash];
        if (lock.from != msg.sender) {
            revert InvalidSender();
        }
        if (ownerOf(lock.nftId) == address(this)) {
            revert TransferAlreadyCompleted();
        }
        bytes32[] memory chainIdTo = new bytes32[](1);
        chainIdTo[0] = paymentChainID;
        address[] memory to = new address[](1);
        to[0] = address(0);
        UnLockNFT memory unLockNft = UnLockNFT({nftId: lock.nftId});
        bytes memory data = abi.encode(unLockNft);
        transferFrom(msg.sender, address(this), lock.nftId);
        mailbox.sendMessage(chainIdTo, to, data);
        delete lockNFTMap[lockHash];
    }
}
