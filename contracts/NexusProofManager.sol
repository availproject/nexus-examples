pragma solidity ^0.8.20;

import {StorageProof} from "./StorageProof.sol";

import {INexusProofManager} from "./interfaces/INexusProofManager.sol";

contract NexusStorageProofManager is INexusProofManager, StorageProof {
 
    uint256 public latestNexusBlockNumber = 0;

    struct NexusBlock {
        bytes32 stateRoot;
        bytes32 blockHash;
    }

    mapping(uint256 => NexusBlock) public nexusBlock;
    mapping(uint256=>uint256) public chainIdToLatestBlockNumber;
    mapping(uint256 => mapping(uint256 => bytes32)) chainIdToState;

    constructor(uint256 chainId) StorageProof(chainId) {}
    function updateNexusBlock(uint256 blockNumber, NexusBlock calldata latestNexusBlock) external  {
        require(blockNumber > latestNexusBlockNumber, "Block already updated");
        // TODO: verify a zk proof from nexus
        nexusBlock[blockNumber] = latestNexusBlock;
        latestNexusBlockNumber = blockNumber;
    }

      // TODO: reduce number of params passed to this function
    function updateChainState(uint256 chainId, uint256 chainBlockNumber, uint256 nexusBlockNumber, bytes calldata accountInclusionProof, bytes32 stateRoot) external {
        // the state verification is correct done by checking it inside a nexus proof which was done when nexus state was updated against a block
        bytes32 stfRoot = getRollupStateRoot(nexusBlockNumber, accountInclusionProof, msg.sender);    // last field is a placeholder needs to be updated based on nexus proof structure for accounts
        require(stfRoot != 0,"Not included"); // update 0 to bytes of 0 
        // extractStateRootFromAccountStorage()  // we use a function input as placeholder for now
        chainIdToLatestBlockNumber[chainId] = chainBlockNumber;
        chainIdToState[chainId][chainBlockNumber] = stateRoot;
    }

    function getRollupStateRoot(uint256 nexusBlockNumber, bytes calldata accountInclusionProof, address account) view public returns (bytes32 storageRoot) {
        // assuming for now this storage data is our state root instead for a rollup
       (,,,storageRoot) = verifyAccount(nexusBlock[nexusBlockNumber].stateRoot, accountInclusionProof, account);
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