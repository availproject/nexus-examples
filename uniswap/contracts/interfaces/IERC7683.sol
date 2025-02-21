// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;
pragma abicoder v2;

struct MailboxMessage {
    bytes32 nexusAppIDFrom;
    bytes32[] nexusAppIDTo;
    bytes data;
    address from;
    address[] to;
    uint256 nonce;
}

bytes32 constant RESOLVED_SWAP_ORDER_TYPEHASH = keccak256(
    'ResolvedSwapOrder(bytes32 token,int256 amount0,int256 amount1,bytes32 recipient,uint256 chainId,uint64 destinationChainId,bytes32 destinationSettler,bytes originData)'
);

interface INexusMailbox {
    event MailboxEvent(
        bytes32 indexed nexusAppIDFrom,
        bytes32[] nexusAppIDTo,
        bytes data,
        address indexed from,
        address[] to,
        uint256 nonce,
        bytes32 receiptHash
    );

    function receiveMessage(
        uint256 chainblockNumber,
        MailboxMessage calldata,
        bytes calldata proof
    ) external;

    function sendMessage(
        bytes32[] memory nexusAppIdTo,
        address[] memory to,
        uint256 nonce,
        bytes calldata data
    ) external;
}
