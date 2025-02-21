// SPDX-License-Identifier: Apache 2.0
pragma solidity =0.7.6;

interface INexusReceiver {
    function onNexusMessage(
        bytes32,
        address,
        bytes calldata,
        uint256 nonce
    ) external;
}
