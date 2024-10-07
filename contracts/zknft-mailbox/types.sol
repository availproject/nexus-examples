// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

struct LockNFT {
    address from;
    uint256 nftId;
    uint256 amount;
    address tokenAddress;
    uint256 blockNumber;
    uint256 nonce;
}

struct PendingPayment {
    address to;
    uint256 nftId;
    uint256 amount;
    address tokenAddress;
}
