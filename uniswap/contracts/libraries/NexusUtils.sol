pragma solidity ^0.7.6;

library NexusUtils {
    uint256 public constant MESSAGES_MAPPING_SLOT = 0;

    function getStorageLocationForReceipt(bytes32 _receiptHash) public pure returns (bytes32) {
        return keccak256(abi.encode(_receiptHash, MESSAGES_MAPPING_SLOT));
    }
}
