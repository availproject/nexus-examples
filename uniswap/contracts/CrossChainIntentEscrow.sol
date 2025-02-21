// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

import './interfaces/ICrossChainIntentEscrow.sol';
import {IERC20Minimal} from './interfaces/IERC20Minimal.sol';

// @notice This contract is used to escrow tokens for a cross-chain swap.
// @dev If the destinatino chain is the liquidity chain, the tokens in this contract are used for payout.
// @dev If the destination chain is not the liquidity chain, the "to" token is locked ( burned ) to this contract until a reverse claim is raised.
contract CrossChainIntentEscrow is ICrossChainIntentEscrow {
    mapping(address => bool) public isPool;
    uint256 token0Amount;
    uint256 token1Amount;

    // TODO: make it onlyPool()
    function lock(
        address token,
        address from,
        uint256 amount
    ) external override {
        IERC20Minimal(token).transferFrom(from, address(this), amount);
    }

    // TODO: make it onlyPool()
    function unlock(
        address token,
        uint256 amount,
        address to
    ) external override {
        IERC20Minimal(token).transfer(to, amount);
    }
}
