// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INexusMailbox, MailboxMessage} from "nexus/interfaces/INexusMailbox.sol";
import {PendingPayment} from "./types.sol";

contract NFTPaymentMailbox {
    INexusMailbox public mailbox;
    bytes32 immutable nftNexusId;
    address immutable nftContractAddress;

    mapping(uint256 => PendingPayment) paymentFrom;

    event PendingPayout(uint256 index, address to);

    error AlreadyPaidFor();
    constructor(
        INexusMailbox _mailbox,
        bytes32 _nftNexusId,
        address _nftContractAddress
    ) {
        mailbox = _mailbox;
        nftNexusId = _nftNexusId;
        nftContractAddress = _nftContractAddress;
    }

    // We assume the user verifies that a payment message was generated at this step before making payment
    // @dev nonce should be the same as NFT sell send message
    function pay(
        address tokenAddress,
        uint256 amount,
        uint256 nftId,
        uint256 nonce,
        address to
    ) public {
        IERC20(tokenAddress).transferFrom(msg.sender, to, amount);

        if (paymentFrom[nftId].nftId == 0) {
            revert AlreadyPaidFor();
        }
        PendingPayment memory pendingReceipt = PendingPayment(
            to,
            nftId,
            amount,
            tokenAddress
        );

        paymentFrom[nftId] = pendingReceipt;
        bytes memory data = abi.encode(pendingReceipt);
        bytes32[] memory NexusIdTo = new bytes32[](1);
        NexusIdTo[0] = nftNexusId;
        address[] memory to_addr = new address[](1);
        to_addr[0] = nftContractAddress;
        mailbox.sendMessage(NexusIdTo, to_addr, nonce, data);
    }
}
