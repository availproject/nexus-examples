// SPDX-License-Identifier: Apache 2.0
pragma solidity =0.7.6;
pragma abicoder v2;

import 'hardhat/console.sol';

contract MockNexusMailbox {
    bytes32 public nexusAppID = bytes32(uint256(1)); // Mock nexus app ID
    struct MailboxMessage {
        bytes32 nexusAppIDFrom;
        bytes32[] nexusAppIDTo;
        bytes data;
        address from;
        address[] to; // if specified on verification, the callback on "to" function will be called
        uint256 nonce; // TODO: Check if nonce can be moved to data field to be handled by sender.
    }

    event MailboxEvent(
        bytes32 indexed nexusAppIDFrom,
        bytes32[] nexusAppIDTo,
        bytes data,
        address indexed from,
        address[] to,
        uint256 nonce,
        bytes32 receiptHash
    );

    // Store sent messages for verification
    MailboxMessage[] public sentMessages;

    constructor() {}

    function sendMessage(
        bytes32[] memory nexusAppIdTo,
        address[] memory to,
        uint256 nonce,
        bytes calldata data
    ) external {
        // Store the message
        sentMessages.push(
            MailboxMessage({
                nexusAppIDFrom: nexusAppID,
                nexusAppIDTo: nexusAppIdTo,
                data: data,
                from: msg.sender,
                to: to,
                nonce: nonce
            })
        );

        // Emit event with a mock receipt hash
        emit MailboxEvent(
            nexusAppID,
            nexusAppIdTo,
            data,
            msg.sender,
            to,
            nonce,
            keccak256(abi.encodePacked(nexusAppID, nexusAppIdTo, nonce))
        );
    }

    function receiveMessage(uint256 chainblockNumber, MailboxMessage calldata receipt, bytes calldata proof) external {
        (bool success, bytes memory data) = receipt.to[0].call(
            abi.encodeWithSignature(
                'onNexusMessage(bytes32,address,bytes,uint256)',
                receipt.nexusAppIDFrom,
                receipt.from,
                receipt.data,
                receipt.nonce
            )
        );
        if (!success) {
            // Print the error data in a readable format to help with debugging
            console.log('Error data:', string(data));
            console.log('Callback failed');
        }
    }

    // Helper functions for testing
    function getSentMessagesCount() external view returns (uint256) {
        return sentMessages.length;
    }

    function getSentMessage(
        uint256 index
    )
        external
        view
        returns (
            bytes32 nexusAppIDFrom,
            bytes32[] memory nexusAppIDTo,
            bytes memory data,
            address from,
            address[] memory to,
            uint256 nonce
        )
    {
        require(index < sentMessages.length, 'Index out of bounds');
        MailboxMessage memory message = sentMessages[index];
        return (message.nexusAppIDFrom, message.nexusAppIDTo, message.data, message.from, message.to, message.nonce);
    }

    // Optional: Add function to set custom nexusAppID for testing
    function setNexusAppID(bytes32 _nexusAppID) external {
        nexusAppID = _nexusAppID;
    }
}
