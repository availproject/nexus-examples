// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import {IERC20} from '../interfaces/IERC20.sol';
import {IUniswapMintable} from '../interfaces/IUniswapMintable.sol';

contract MockNexusLockAndMint is IUniswapMintable, IERC20 {
    string public constant name = 'NexusLockAndMint';
    string public constant symbol = 'NLM';
    uint8 public constant decimals = 18;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 public override totalSupply;

    function transfer(address to, uint256 amount) external override returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address token, address to, uint256 amount) external override {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address token, address from, uint256 amount) external override {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
