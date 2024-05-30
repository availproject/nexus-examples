pragma solidity ^0.8.19;

import {IAvail} from "./interfaces/IAvail.sol";

contract Storage { 
    uint256 immutable public selfChainId;

    // map store spent message hashes, used for Avail -> Ethereum messages
    mapping(bytes32 => bool) public isBridged;
    // map message hashes to their message ID, used for Ethereum -> Avail messages
    mapping(uint256 => bytes32) public isSent;
    // map Avail asset IDs to an Ethereum address
    mapping(bytes32 => address) public tokens;

    IAvail public avail;
    address public feeRecipient;
    uint256 public fees; // total fees accumulated by bridge
    uint256 public feePerByte; // in wei
    uint256 public messageId; // next nonce
}