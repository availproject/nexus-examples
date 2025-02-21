// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import './callback/IUniswapV3SwapCallback.sol';
import './ISwapIntents.sol';

interface IUniswapNexusV3Pool is IUniswapV3SwapCallback {
    function swapIntent(
        bool zeroForOne,
        uint160 sqrtPriceLimitX96,
        SwapOrder calldata swapOrder
    ) external returns (int256 amount0, int256 amount1);
}
