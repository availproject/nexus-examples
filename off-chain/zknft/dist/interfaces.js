"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORAGE_VERIFIER_INTERFACE = exports.ZKSYNC_DIAMOND_INTERFACE = void 0;
const ethers_1 = require("ethers");
/** Interface of the Diamond Contract */
exports.ZKSYNC_DIAMOND_INTERFACE = new ethers_1.Interface([
    `function commitBatchesSharedBridge(
        uint256 _chainId,
        (uint64,bytes32,uint64,uint256,bytes32,bytes32,uint256,bytes32) lastCommittedBatchData,
        (uint64,uint64,uint64,bytes32,uint256,bytes32,bytes32,bytes32,bytes,bytes)[] newBatchesData
    )`,
    `function l2LogsRootHash(uint256 _batchNumber) external view returns (bytes32)`,
    `function storedBatchHash(uint256) public view returns (bytes32)`,
    `event BlockCommit(uint256 indexed batchNumber, bytes32 indexed batchHash, bytes32 indexed commitment)`,
]);
exports.STORAGE_VERIFIER_INTERFACE = new ethers_1.Interface([
    `function verify(
        ( (uint64 batchNumber,
           uint64 indexRepeatedStorageChanges,
           uint256 numberOfLayer1Txs,
           bytes32 priorityOperationsHash,
           bytes32 l2LogsTreeRoot,
           uint256 timestamp,
           bytes32 commitment ) metadata,
          address account,
          uint256 key,
          bytes32 value,
          bytes32[] path,
          uint64 index ) proof
    ) view returns (bool)`,
]);
