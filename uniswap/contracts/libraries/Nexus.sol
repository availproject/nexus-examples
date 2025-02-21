// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.7.6;
pragma abicoder v2;

import '../interfaces/IERC7683.sol';
import '../interfaces/ISwapIntents.sol';
import {IUniswapV3SwapCallback} from '../interfaces/callback/IUniswapV3SwapCallback.sol';
import {ICrossChainIntentEscrow} from '../interfaces/ICrossChainIntentEscrow.sol';
import {IERC20Minimal} from '../interfaces/IERC20Minimal.sol';
import './TransferHelper.sol';
import './LowGasSafeMath.sol';
import './SafeCast.sol';
import './SwapMath.sol';

import 'hardhat/console.sol';

library Nexus {
    using LowGasSafeMath for uint256;
    using SafeCast for uint256;
    using SafeCast for int256;

    struct Pool {
        address pool;
        address token0;
        address token1;
        uint256 balance0;
        uint256 balance1;
        int256 amount0;
        int256 amount1;
        bool zeroForOne;
    }

    function _sendMailboxMessage(
        SwapOrder calldata swapOrder,
        INexusMailbox mailbox,
        ICrossChainIntentEscrow escrow,
        Pool memory pool
    ) external {
        OnchainCrossChainOrder memory memo = get_memo(swapOrder, pool);
        (bool success, bytes memory data) = address(mailbox).call(abi.encodeWithSignature('nexusAppID()'));
        require(success, 'IM');
        bytes32 nexusID = abi.decode(data, (bytes32));
        if (pool.zeroForOne) {
            if (pool.amount1 < 0) {
                if (swapOrder.mandate.nexusTargetID == nexusID) {
                    TransferHelper.safeTransfer(pool.token1, swapOrder.mandate.receiver, uint256(-pool.amount1));
                } else {
                    escrow.lock(pool.token1, address(this), uint256(-pool.amount1));
                }
            }
            uint256 balance0Before = pool.balance0;

            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
                pool.amount0,
                pool.amount1,
                abi.encode(swapOrder.arbiter)
            );

            require(
                balance0Before.add(uint256(pool.amount0)) <= IERC20Minimal(pool.token0).balanceOf(address(this)),
                'IIA'
            );
        } else {
            if (pool.amount0 < 0) {
                if (swapOrder.mandate.nexusTargetID == nexusID) {
                    TransferHelper.safeTransfer(pool.token0, swapOrder.mandate.receiver, uint256(-pool.amount0));
                } else {
                    escrow.lock(pool.token0, address(this), uint256(-pool.amount0));
                }
            }
            uint256 balance1Before = pool.balance1;
            IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
                pool.amount0,
                pool.amount1,
                abi.encode(swapOrder.arbiter)
            );
            require(
                balance1Before.add(uint256(pool.amount1)) <= IERC20Minimal(pool.token1).balanceOf(address(this)),
                'IIA'
            );
        }

        _sendMailboxMessage(mailbox, swapOrder, memo);
    }

    function get_memo(SwapOrder memory swapOrder, Pool memory pool)
        private
        pure
        returns (OnchainCrossChainOrder memory)
    {
        ResolvedSwapOrder memory resolvedSwapOrder =
            ResolvedSwapOrder({
                token: bytes32(uint256(uint160(swapOrder.mandate.token1))),
                amount0: pool.amount0,
                amount1: pool.amount1,
                recipient: bytes32(uint256(uint160(swapOrder.mandate.receiver))),
                chainId: swapOrder.compact.nexusSourceID,
                destinationChainId: swapOrder.mandate.nexusTargetID,
                destinationSettler: bytes32(uint256(uint160(address(0)))),
                orderID: swapOrder.orderID,
                zeroForOne: pool.zeroForOne
            });

        return
            OnchainCrossChainOrder({
                fillDeadline: swapOrder.mandate.expires,
                orderDataType: RESOLVED_SWAP_ORDER_TYPEHASH,
                orderData: abi.encode(resolvedSwapOrder)
            });
    }

    function _sendMailboxMessage(
        INexusMailbox mailbox,
        SwapOrder memory swapOrder,
        OnchainCrossChainOrder memory memo
    ) private {
        bytes32[] memory appIds = new bytes32[](1);
        address[] memory receivers = new address[](1);
        appIds[0] = swapOrder.mandate.nexusTargetID;
        receivers[0] = swapOrder.processor;
        mailbox.sendMessage(appIds, receivers, swapOrder.compact.nonce, abi.encode(memo));
    }
}
