// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

interface ICrossChainIntentEscrow {
    function lock(
        address token,
        address from,
        uint256 amount
    ) external;

    function unlock(
        address token,
        uint256 amount,
        address to
    ) external;
}
