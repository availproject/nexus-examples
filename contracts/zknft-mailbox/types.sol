// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

struct LockNFT {
    address from;
    uint256 nftId;
    uint256 amount;
    address tokenAddress;
}

struct UnLockNFT {
    uint256 nftId;
}

struct ConfirmationReciept {
    uint256 nftId;
    address to;
    uint256 amount;
    address tokenAddress;
}

struct PendingPayment {
    address to;
    uint256 nftId;
    uint256 timestamp;
    uint256 amount;
    address tokenAddress;
}
