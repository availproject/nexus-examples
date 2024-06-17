pragma solidity ^0.8.20;

import {StorageProof} from "./StorageProof.sol";
import {JellyfishMerkleTreeVerifier} from "./lib/SparseMerkleTree.sol";

contract NexusProofManager is StorageProof {
    uint256 public latestNexusBlockNumber = 0;

    struct NexusBlock {
        bytes32 stateRoot;
        bytes32 blockHash;
    }

    mapping(uint256 => NexusBlock) public nexusBlock;
    mapping(uint256=>uint256) public chainIdToLatestBlockNumber;
    mapping(uint256 => mapping(uint256 => bytes32)) chainIdToState;

    struct AccountState { 
        bytes32 statementDigest;
        bytes32 stateRoot;
        bytes32 startNexusHash;
        uint128 lastProofHeight;
        uint128 height;
    }

    constructor(uint256 chainId) StorageProof(chainId) {}

    // nexus state root
    // updated when we verify the zk proof and then st block updated
    function updateNexusBlock(uint256 blockNumber, NexusBlock calldata latestNexusBlock) external  {
        require(blockNumber > latestNexusBlockNumber, "Block already updated");
        // TODO: verify a zk proof from nexus
        nexusBlock[blockNumber] = latestNexusBlock;
        latestNexusBlockNumber = blockNumber;
    }


    function updateChainState(uint256 chainId, uint256 chainBlockNumber, uint256 nexusBlockNumber, bytes32[] calldata  siblings, bytes32 key,  AccountState calldata accountState) external {
        bytes32 valueHash = sha256(abi.encode(accountState.statementDigest, accountState.stateRoot, accountState.startNexusHash, accountState.lastProofHeight,accountState.height));
        JellyfishMerkleTreeVerifier.Leaf memory leaf = JellyfishMerkleTreeVerifier.Leaf({
        addr: key,
        valueHash: valueHash
        });

        JellyfishMerkleTreeVerifier.Proof memory proof = JellyfishMerkleTreeVerifier.Proof({
            leaf: leaf,
            siblings: siblings
        });

        verifyRollupState(nexusBlock[nexusBlockNumber].stateRoot , proof, leaf);   
        
        require(chainIdToLatestBlockNumber[chainId]<chainBlockNumber,"Old block number");
        chainIdToLatestBlockNumber[chainId] = chainBlockNumber;
        chainIdToState[chainId][chainBlockNumber] = accountState.stateRoot;
    }


    function verifyRollupState(bytes32 root, JellyfishMerkleTreeVerifier.Proof memory proof, JellyfishMerkleTreeVerifier.Leaf memory leaf) pure public {
        bool verify = JellyfishMerkleTreeVerifier.verifyProof(root, leaf, proof);
        require(verify,"Invalid leaf against nexus state root");
    }

    function getStorageRoot(uint256 chainId, uint256 chainBlockNumber, address account, bytes calldata accountTrieProof) external view returns(bytes32) {
        require(chainBlockNumber <= chainIdToLatestBlockNumber[chainId], "Invalid block number");
        bytes32 stateRoot = chainIdToState[chainId][chainBlockNumber];
        (,,,bytes32 storageRoot) = verifyAccount(stateRoot, accountTrieProof, account);
        return storageRoot;
    }

    function getChainState(uint256 blockNumber, uint256 chainId) external view returns(bytes32) {
        if (blockNumber == 0 ){ 
            return chainIdToState[chainId][chainIdToLatestBlockNumber[chainId]];
        }
        else {
              require(blockNumber <= chainIdToLatestBlockNumber[chainId]);
              return chainIdToState[chainId][blockNumber];
        }
    }
}