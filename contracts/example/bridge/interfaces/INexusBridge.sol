// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IVectorx} from "./IVectorx.sol";

interface INexusBridge {
    struct Message {
        // single-byte prefix representing the message type
        bytes1 messageType;
        // address of message sender
        bytes32 from;
        // address of message receiver
        bytes32 to;
        // data being sent
        bytes data;
        // nonce
        uint64 messageId;
    }
    struct MessageReceieve {
        // single-byte prefix representing the message type
        bytes1 messageType;
        // address of message sender
        bytes32 from;
        // address of message receiver
        bytes32 to;
        // data being sent
        bytes data;
        // nonce
        uint64 messageId;

        bytes storageProof;

        bytes32 storageSlot;
    }

    event MessageReceived(bytes32 indexed from, address indexed to, uint256 messageId);
    event MessageSent(address indexed from, bytes32 indexed to, uint256 messageId);

    error AlreadyBridged();
    error ArrayLengthMismatch();
    error BlobRootEmpty();
    error BridgeRootEmpty();
    error DataRootCommitmentEmpty();
    error FeeTooLow();
    error InvalidAssetId();
    error InvalidDataLength();
    error InvalidDataRootProof();
    error InvalidDomain();
    error InvalidDestinationOrAmount();
    error InvalidFungibleTokenTransfer();
    error InvalidLeaf();
    error InvalidMerkleProof();
    error InvalidMessage();
    error UnlockFailed();
    error WithdrawFailed();

    function setPaused(bool status) external;
    function updateTokens(bytes32[] calldata assetIds, address[] calldata tokenAddresses) external;
    function updateFeePerByte(uint256 newFeePerByte) external;
    function updateFeeRecipient(address newFeeRecipient) external;
    function withdrawFees() external;
    function receiveMessage(MessageReceieve calldata message, bytes calldata input) external;
    function receiveETH(MessageReceieve calldata message, bytes calldata input) external;
    function receiveERC20(MessageReceieve calldata message, bytes calldata input) external;
    function sendMessage(bytes32 recipient, bytes calldata data) external payable;
    function sendETH(bytes32 recipient) external payable;
    function sendERC20(bytes32 assetId, bytes32 recipient, uint256 amount) external;
}