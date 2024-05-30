pragma solidity ^0.8.19;

import {StorageProof} from "./StorageProof.sol";

contract NexusStorageProofManager is StorageProof {
    uint256 latestNexusBlockNumber = 0;

    struct NexusBlock {
        bytes32 stateRoot;
        bytes32 blockHash;
    }

    mapping(uint256 => NexusBlock) nexusBlock;
    mapping(uint256=>uint256) chainIdToLatestBlockNumber;
    mapping(uint256 => mapping(uint256 => bytes32)) chainIdToState;

    function updateNexusBlock(uint256 blockNumber, NexusBlock latestNexusBlock) external  {
        require(blockNumber > latestNexusBlockNumber, "Block already updated");
        // TODO: verify a zk proof from nexus
        nexusBlockToState[blockNumber] = latestNexusBlock;
        latestNexusBlockNumber = blockNumber;
    }

    function getStorageRoot(uint256 nexusBlockNumber, bytes32 accountInclusionProof, address account) public returns (bytes32 storageRoot) {
       (,,,storageRoot) = verifyAccount(nexusBlock[nexusBlockNumber].stateRoot, accountInclusionProof, account);
    }

    // TODO: reduce number of params passed to this function
    function updateChainState(uint256 chainId, uint256 chainBlockNumber, uint256 nexusBlockNumber, bytes32 calldata accountInclusionProof, bytes32 stateRoot) external {
        // verify state transition is correct by checking it inside a nexus proof which was done when nexus state was updated against a block
        bytes32 stfRoot = getStorageRoot(nexusBlockNumber, accountInclusionProof, account);
        require(stfRoot != 0,"Not included"); // update 0 to bytes of 0 
        // extractStateRootFromAccountStorage()  // we use a function input as placeholder for now
        chainIdToLatestBlockNumber[chainId] = chainBlockNumber;
        chainIdToState[chainId][chainBlockNumber] = stateRoot;
    }

    function getChainIDState(uint256 blockNumber, uint256 chainId) {
        if (blockNumber == 0 ){ 
            return chainIdToState[chainId][chainIdToLatestBlockNumber[chainId]];
        }
        else {
              require(blockNumber <= chainIdToLatestBlockNumber[chainId]);
              return chainIdToState[chainId][blockNumber];
        }
    }
}