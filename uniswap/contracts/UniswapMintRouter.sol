// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IUniswapMintable} from './interfaces/IUniswapMintable.sol';

contract UniswapMintRouter is IUniswapMintable {
    mapping(address => bool) public tokens;

    function mint(
        address token,
        address to,
        uint256 amount
    ) external {
        require(tokens[token], 'TOKEN_NOT_SUPPORTED');
        token.call(abi.encodeWithSignature('mint(address,uint256)', to, amount));
    }

    // TODO: add a modifier to restrict caller
    function addToken(address token) external {
        tokens[token] = true;
    }
}
