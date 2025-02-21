// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

struct ResolvedCrossChainOrder {
    address user;
    bytes32 originChainId;
    uint256 openDeadline;
    uint256 fillDeadline;
    bytes32 orderId;
    Output[] maxSpent;
    Output[] minReceived;
    FillInstruction[] fillInstructions;
}

/// @notice Tokens that must be receive for a valid order fulfillment
struct Output {
    bytes32 token;
    int256 amount;
    bytes32 recipient;
    bytes32 chainId;
}

struct FillInstruction {
    uint64 destinationChainId;
    bytes32 destinationSettler;
    bytes originData;
}

// Structs for order data
struct Compact {
    address sponsor; // The account to source the tokens from.
    uint256 nonce; // A parameter to enforce replay protection, scoped to allocator.
    address token0; // The token ID of the ERC6909 token to allocate. In our design this will represent the token0 address
    uint256 amount; // The amount of ERC6909 tokens to allocate.
    uint256 feeTier; // The fee tier to be used for the swap.
    uint256 stake; // The amount of tokens to be staked as a commitment to the order for solver to accept.
    bytes32 nexusSourceID; // The nexus source ID to send the settled tokens to.
}

struct Mandate {
    bytes32 nexusTargetID; // The nexus target ID to send the settled tokens to. For now we limit this to the origin chain ID.
    address token1; // The token address of token to receive on the destination
    uint256 minimumAmount; // The minimum amount of token1 to receive after the swap.
    uint256 expires; // The block timestamp at which the claim expires.
    address receiver; // The address on destination chain to receive the tokens.
    bytes32 salt; // A parameter to enforce replay protection, scoped to allocator.
}

struct Petition {
    Compact compact;
    Mandate mandate;
}

struct SwapOrder {
    address arbiter; // The account tasked with verifying and submitting the claim.
    Compact compact;
    Mandate mandate;
    uint256 amountLocked;
    bytes32 orderID;
    address processor; // Swap Intends contract that will receive message from mailbox and process with fund release
}

struct ResolvedSwapOrder {
    bytes32 token;
    int256 amount0;
    int256 amount1;
    bytes32 recipient;
    bytes32 chainId;
    bytes32 destinationChainId;
    bytes32 destinationSettler;
    bytes32 orderID;
    bool zeroForOne;
}

// EIP 7683
struct OnchainCrossChainOrder {
    uint256 fillDeadline;
    bytes32 orderDataType;
    bytes orderData;
}
