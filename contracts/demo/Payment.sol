// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Payment {
    mapping(uint256=>mapping(address=> bool)) nftIDToUser;

    uint256 constant nftPrice = 0.001 ether;

    // todo: include asset address on deployment. For now assuming it as usdc.
    function buyNft(address asset, uint256 nftId) external {
        IERC20(asset).transferFrom(msg.sender, address(this), nftPrice);
        nftIDToUser[nftId][msg.sender] = true;
    }

    function _checkPurchaseStatus(uint256 nftId, address userAddress) private {
        require(nftIDToUser[nftId][userAddress] == false, "NFT already purchased");
    }
}