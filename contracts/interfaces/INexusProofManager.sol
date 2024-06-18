// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

//TODO: add variable names instead of just types
interface INexusProofManager { 
    function getStorageRoot(bytes32,uint256, address, bytes calldata) external view returns(bytes32);
    function getChainState(uint256, bytes32) external returns(bytes32);
    function verifyAccount(bytes32, bytes calldata, address) external view returns(uint256, uint256, bytes32, bytes32);
    function verifyStorage(bytes32, bytes32, bytes calldata) external view returns(bytes32);
}