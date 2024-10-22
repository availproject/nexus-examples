// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

struct LockedNFT {
    address from;
    uint256 nftId;
    uint256 amount;
    address tokenAddress;
    uint256 blockNumber;
    uint256 nonce;
    address paymentReceiver;
    address paymentFrom;
    address nftReceiver;
}

struct PaymentReceipt {
    address from;
    address to;
    uint256 nftId;
    uint256 amount;
    address tokenAddress;
}
