// SPDX-License-Identifier: Apache 2.0
pragma solidity =0.7.6;

interface INexusVerifierWrapper {
    function parseAndVerify(
        uint256 chainblockNumber,
        bytes32 receipt,
        bytes calldata,
        address from
    ) external;
}
