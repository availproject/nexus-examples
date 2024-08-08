// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";

contract Payment {
    INexusProofManager public nexus;
    mapping(uint256=>mapping(address=> bool)) nftIDToUser;

    uint256 constant nftPrice = 0.001 ether;

    constructor(INexusProofManager nexusManager) {
        nexus = nexusManager;
    }
    
    // todo: include asset address on deployment. For now assuming it as usdc.
    function buyNft(address asset, uint256 nftId) external {
        _checkPurchaseStatus(nftId, msg.sender);
        IERC20(asset).transferFrom(msg.sender, address(this), nftPrice);
        nftIDToUser[nftId][msg.sender] = true;
    }

    function _checkPurchaseStatus(uint256 nftId, address userAddress) view private {
        require(nftIDToUser[nftId][userAddress] == false, "NFT already purchased");
    }
}