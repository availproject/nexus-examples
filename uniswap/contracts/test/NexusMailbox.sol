// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.7.6;
pragma abicoder v2;

import '../interfaces/nexus/INexusMailbox.sol';

contract MockNexusMailbox is INexusMailbox {
    bytes32 public nexusAppID = bytes32(uint256(1)); // Mock nexus app ID

    // Store sent messages for verification
    MailboxMessage[] public sentMessages;

    function sendMessage(
        bytes32[] memory nexusAppIdTo,
        address[] memory to,
        uint256 nonce,
        bytes calldata data
    ) external override {
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
            keccak256(abi.encodePacked(nexusAppID, nexusAppIdTo, msg.sender))
        );
    }

    function receiveMessage(
        uint256 chainblockNumber,
        MailboxMessage calldata message,
        bytes calldata proof
    ) external override {
        // Mock implementation - do nothing or add test-specific logic
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
