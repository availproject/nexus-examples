// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INexusMailbox, Receipt} from "nexus/interfaces/INexusMailbox.sol";
import {LockNFT, PendingPayment, ConfirmationReciept, PendingPayment, UnLockNFT} from "./types.sol";

contract NFTPayment {
    INexusMailbox public mailbox;
    bytes32 immutable selfChainId;
    bytes32 immutable nftChainId;

    mapping(uint256 => PendingPayment) paymentFrom;

    event PendingPayout(uint256 index, address to);

    constructor(
        INexusMailbox _mailbox,
        bytes32 _selfChainId,
        bytes32 _nftChainId
    ) {
        mailbox = _mailbox;
        selfChainId = _selfChainId;
        nftChainId = _nftChainId;
    }

    function pay(
        Receipt calldata nftLockedMailboxReceipt,
        uint256 chainBlockNumber,
        bytes calldata proof
    ) public {
        mailbox.receiveMessage(
            chainBlockNumber,
            nftLockedMailboxReceipt,
            proof,
            false
        );
        LockNFT memory lockNft = abi.decode(
            nftLockedMailboxReceipt.data,
            (LockNFT)
        );
        IERC20(lockNft.tokenAddress).transferFrom(
            msg.sender,
            address(this),
            lockNft.amount
        );

        PendingPayment memory pendingReceipt = PendingPayment(
            msg.sender,
            lockNft.nftId,
            block.timestamp, // insecure
            lockNft.amount,
            lockNft.tokenAddress
        );

        paymentFrom[lockNft.nftId] = pendingReceipt;
        bytes memory data = abi.encode(pendingReceipt);
        bytes32[] memory chainIdTo = new bytes32[](1);
        chainIdTo[0] = nftChainId;
        address[] memory to = new address[](1);
        to[0] = address(0);
        mailbox.sendMessage(chainIdTo, to, data);
    }

    function claimPayment(
        uint256 chainblockNumber,
        Receipt calldata mailboxReceipt,
        bytes calldata proof,
        bool callback
    ) public {
        mailbox.receiveMessage(
            chainblockNumber,
            mailboxReceipt,
            proof,
            callback
        );
        ConfirmationReciept memory receipt = abi.decode(
            mailboxReceipt.data,
            (ConfirmationReciept)
        );
        IERC20(receipt.tokenAddress).transfer(receipt.to, receipt.amount);
    }

    function withdrawPayment(
        uint256 chainblockNumber,
        Receipt calldata mailboxReceipt,
        bytes calldata proof,
        bool callback
    ) public {
        mailbox.receiveMessage(
            chainblockNumber,
            mailboxReceipt,
            proof,
            callback
        );
        UnLockNFT memory unlockInfo = abi.decode(
            mailboxReceipt.data,
            (UnLockNFT)
        );
        PendingPayment memory paymentInfo = paymentFrom[unlockInfo.nftId];
        IERC20(paymentInfo.tokenAddress).transfer(
            paymentInfo.to,
            paymentInfo.amount
        );
        delete paymentFrom[unlockInfo.nftId];
    }
}
