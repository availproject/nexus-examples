// SPDX-Licences-Identifier: Apacher-2.0
pragma solidity ^0.8.20;

abstract contract Payment { 

    bytes1 private constant MESSAGE_TX_PREFIX = 0x01;
    bytes1 private constant TOKEN_TX_PREFIX = 0x02;
    bytes1 private constant LOCK_MINT_PREFIX = 0x03;
    bytes1 private constant PAYMENT = 0x04;

    mapping(uint256 => bytes32)  public idToHash;

    struct Message {
        bytes1 messageType;
        bytes32 from;
        bytes data;
        uint256 messageId;
        uint256 chainId;
    }

    event NewEntry(
        uint256 key,
        bytes32 hash_value
    );

    event PreImage(
        bytes1 messageType,
        bytes32 from,
        bytes data,
        uint256 messageId,
        uint256 chainId
    );

     function _store(uint256 key, bytes32 value) internal virtual{
        _beforeStoring();
        idToHash[key] = value;
        emit NewEntry(key, value);
        _afterStoring();
     }

     function _beforeStoring() internal virtual {}
     function _afterStoring() internal virtual {}
}