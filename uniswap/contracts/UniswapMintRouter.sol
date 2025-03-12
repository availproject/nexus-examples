// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
pragma abicoder v2;

import {IUniswapMintable} from './interfaces/IUniswapMintable.sol';

contract UniswapMintRouter is IUniswapMintable {
    mapping(address => bool) public tokens;

    function mint(address token, address to, uint256 amount) external override {
        require(tokens[token], 'TOKEN_NOT_SUPPORTED');
        token.call(abi.encodeWithSignature('mint(address,uint256)', to, amount));
    }

    function burn(address token, address from, uint256 amount) external override {
        require(tokens[token], 'TOKEN_NOT_SUPPORTED');
        token.call(abi.encodeWithSignature('burn(address,uint256)', from, amount));
    }

    // TODO: add a modifier to restrict caller
    function addToken(address token) external {
        tokens[token] = true;
    }
}
