// SPDX-License-Identifier: Apache-2.0

interface INexusProofManager { 
    function getRollupStateRoot(uint256, bytes calldata, address) external returns(bytes32);
    function getStorageRoot(uint256,uint256, address, bytes calldata) external view returns(bytes32);
    function getChainState(uint256, uint256) external returns(bytes32);
}