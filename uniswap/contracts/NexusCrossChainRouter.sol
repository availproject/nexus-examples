// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import './interfaces/IUniswapNexusV3Pool.sol';
import './interfaces/IUniswapV3Pool.sol';
import {IERC20Minimal} from './interfaces/IERC20Minimal.sol';

contract NexusCrossChainRouter is IUniswapNexusV3Pool {
    event SwapCallback(int256 amount0Delta, int256 amount1Delta);

    address public immutable pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function swapIntent(
        bool zeroForOne,
        uint160 sqrtPriceLimitX96,
        SwapOrder calldata swapOrder
    ) external override returns (int256 amount0, int256 amount1) {
        return IUniswapNexusV3Pool(pool).swapIntent(zeroForOne, sqrtPriceLimitX96, swapOrder);
    }

    function uniswapV3SwapCallback(
        int256 amount0,
        int256 amount1,
        bytes calldata data
    ) external override {
        address arbiter = abi.decode(data, (address));

        emit SwapCallback(amount0, amount1);

        require(arbiter == address(0), 'ARBITER_NOT_ZERO');

        if (amount0 > 0) {
            IERC20Minimal(IUniswapV3Pool(msg.sender).token0()).transferFrom(arbiter, msg.sender, uint256(amount0));
        } else if (amount1 > 0) {
            IERC20Minimal(IUniswapV3Pool(msg.sender).token1()).transferFrom(arbiter, msg.sender, uint256(amount1));
        } else {
            // if both are not gt 0, both must be 0.
            assert(amount0 == 0 && amount1 == 0);
        }
    }
}
