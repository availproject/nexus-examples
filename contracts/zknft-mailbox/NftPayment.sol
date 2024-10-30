// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INexusMailbox, MailboxMessage} from "nexus/interfaces/INexusMailbox.sol";
import {PaymentReceipt} from "./types.sol";

contract NFTPaymentMailbox {
    INexusMailbox public mailbox;
    bytes32 immutable nftNexusId;
    address immutable nftContractAddress;
    uint256 public constant MESSAGES_MAPPING_SLOT = 0;

    mapping(address => uint256) accountNonce;

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

    function getStorageLocationForReceipt(
        bytes32 _receiptHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(_receiptHash, MESSAGES_MAPPING_SLOT));
    }

    // We assume the user verifies that a payment message was generated at this step before making payment
    // @dev nonce should be the same as NFT sell send message
    function pay(
        address tokenAddress,
        uint256 amount,
        uint256 nftId,
        address to
    ) public {
        IERC20(tokenAddress).transferFrom(msg.sender, to, amount);

        PaymentReceipt memory paymentReceipt = PaymentReceipt(
            msg.sender,
            to,
            nftId,
            amount,
            tokenAddress
        );

        bytes memory data = abi.encode(paymentReceipt);
        bytes32[] memory NexusIdTo = new bytes32[](1);
        NexusIdTo[0] = nftNexusId;
        address[] memory to_addr = new address[](1);
        to_addr[0] = nftContractAddress;
        mailbox.sendMessage(
            NexusIdTo,
            to_addr,
            accountNonce[msg.sender] + 1,
            data
        );

        accountNonce[msg.sender] += 1;
    }

    function getCurrentNonce(address account) public view returns (uint256) {
        return accountNonce[account];
    }
}
