// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IAvail} from "../contracts/bridge/interfaces/IAvail.sol";
import "../contracts/bridge/NexusBridge.sol";
import "../contracts/mock/ERC20.sol";

import "nexus/verification/ethereum/Verifier.sol";
import "nexus/NexusProofManager.sol";

import "nexus/interfaces/INexusProofManager.sol";

contract BridgeTest is Test { 
    NexusBridge public bridge;
    ERC20Token erc20;
    ERC20Token erc20_2;
    ERC20Token erc20_3;
    bytes32 assetId = bytes32(uint256(1));
    bytes32 nexusAssetID = bytes32(uint256(2));
    uint256 mintAmount = 10000000;

    function setUp() public {


        bridge = new NexusBridge();
        
        erc20 = new ERC20Token("Avail","Avail");
        erc20.mint(address(bridge), mintAmount);
        erc20.mint(address(this), mintAmount);
        erc20.approve(address(bridge), mintAmount);
        erc20_2 = new ERC20Token("USDC","USDC");
        erc20_2.mint(address(this), mintAmount);
        erc20_2.mint(address(bridge), mintAmount);
        erc20_2.approve(address(bridge), mintAmount);
        erc20_3 = new ERC20Token("nUSDC","nUSDC");
        erc20_3.mint(address(bridge), mintAmount);
        erc20_3.mint(address(this), mintAmount);
        erc20_3.approve(address(bridge), mintAmount);

        NexusProofManager nexusState = new NexusProofManager();
        EthereumVerifier verifier = new EthereumVerifier(INexusProofManager(address(nexusState)));
        bridge.initialize(100,address(this), IAvail(address(erc20)),address(this), address(this), INexusProofManager(address(nexusState)), bytes32(uint256(137)), verifier);
        bytes32[] memory assetIds = new bytes32[](1);
        assetIds[0]= assetId;

        address[] memory tokenAddresses = new address[](1);
        tokenAddresses[0] = address(erc20_2);
      
        bridge.updateTokens(assetIds, tokenAddresses);

        bytes32[] memory assetIds_2 = new bytes32[](1);
        assetIds_2[0]= nexusAssetID;

        address[] memory tokenAddresses_2 = new address[](1);
        tokenAddresses_2[0] = address(erc20_3);

        bridge.updateNexusTokens(assetIds_2, tokenAddresses_2);
    }

    function testSendERC20Token() public { 
        assertEq(erc20_2.balanceOf(address(this)), mintAmount, "Invalid mint amount initial test");
        bridge.sendERC20(assetId, bytes32(uint256(uint160(address(this)))), mintAmount/10);
        assertEq(erc20_2.balanceOf(address(this)), mintAmount - mintAmount/10, "Invalid mint amount final test");
    }
    function testSendERC20NexusToken() public { 
        assertEq(erc20_3.balanceOf(address(this)), mintAmount, "Invalid mint amount initial test");
        bridge.sendERC20(nexusAssetID, bytes32(uint256(uint160(address(this)))), mintAmount/10);
        assertEq(erc20_3.balanceOf(address(this)), mintAmount - mintAmount/10, "Invalid mint amount final test");
    }

    function testReceieveERC20() public {

    }
}