pragma solidity ^0.8.13;
import "./StorageProof.sol";
import "../../NexusProofManager.sol";


contract EthereumVerifier is StorageProof { 
    NexusProofManager immutable nexusStateManager;

    constructor(bytes32 chainId, NexusProofManager _nexusStateManager) StorageProof(chainId){
        nexusStateManager = _nexusStateManager;
    }
    function getStorageRoot(bytes32 nexusAppID, uint256 chainBlockNumber, address account, bytes calldata accountTrieProof) external view returns(bytes32) {
        require(chainBlockNumber <= nexusStateManager.nexusAppIDToLatestBlockNumber(nexusAppID), "Invalid block number");
        bytes32 stateRoot = nexusStateManager.nexusAppIDToState(nexusAppID, chainBlockNumber);
        (,,,bytes32 storageRoot) = verifyAccount(stateRoot, accountTrieProof, account);
        return storageRoot;
    }
}