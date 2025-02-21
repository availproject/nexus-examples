// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/cryptography/MessageHashUtils.sol)

pragma solidity =0.7.6;

/**
 * @dev Signature message hash utilities for producing digests to be consumed by {ECDSA} recovery or signing.
 *
 * The library provides methods for generating a hash of a message that conforms to the
 * https://eips.ethereum.org/EIPS/eip-191[ERC-191] and https://eips.ethereum.org/EIPS/eip-712[EIP 712]
 * specifications.
 */
library MessageHashUtils {
    /**
     * @dev Returns the keccak256 digest of an ERC-191 signed data with version
     * `0x45` (`personal_sign` messages).
     *
     * The digest is calculated by prefixing a bytes32 `messageHash` with
     * `"\x19Ethereum Signed Message:\n32"` and hashing the result. It corresponds with the
     * hash signed when using the https://eth.wiki/json-rpc/API#eth_sign[`eth_sign`] JSON-RPC method.
     *
     * NOTE: The `messageHash` parameter is intended to be the result of hashing a raw message with
     * keccak256, although any bytes32 value can be safely used because the final digest will
     * be re-hashed.
     *
     * See {ECDSA-recover}.
     */
    function toEthSignedMessageHash(bytes32 messageHash) internal pure returns (bytes32 digest) {
        assembly {
            mstore(0x00, '\x19Ethereum Signed Message:\n32')
            mstore(0x1c, messageHash)
            digest := keccak256(0x00, 0x3c)
        }
    }

    /**
     * @dev Returns the keccak256 digest of an ERC-191 signed data with version
     * `0x45` (`personal_sign` messages).
     *
     * The digest is calculated by86 prefixing an arbitrary `message` with
     * `"\x19Ethereum Signed Message:\n" + len(message)` and hashing the result. It corresponds with the
     * hash signed when using the https://eth.wiki/json-rpc/API#eth_sign[`eth_sign`] JSON-RPC method.
     *
     * See {ECDSA-recover}.
     */
    function toEthSignedMessageHash(bytes memory message) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n', bytes(toString(message.length)), message));
    }

    /**
     * @dev Returns the keccak256 digest of an ERC-191 signed data with version
     * `0x00` (data with intended validator).
     *
     * The digest is calculated by prefixing an arbitrary `data` with `"\x19\x00"` and the intended
     * `validator` address. Then hashing the result.
     *
     * See {ECDSA-recover}.
     */
    function toDataWithIntendedValidatorHash(address validator, bytes memory data) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked('\x19\x00', validator, data));
    }

    /**
     * @dev Returns the keccak256 digest of an EIP-712 typed data (ERC-191 version `0x01`).
     *
     * The digest is calculated from a `domainSeparator` and a `structHash`, by prefixing them with
     * `\x19\x01` and hashing the result. It corresponds to the hash signed by the
     * https://eips.ethereum.org/EIPS/eip-712[`eth_signTypedData`] JSON-RPC method as part of EIP-712.
     *
     * See {ECDSA-recover}.
     */
    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32 digest) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x1901)
            mstore(add(ptr, 0x02), domainSeparator)
            mstore(add(ptr, 0x22), structHash)
            digest := keccak256(ptr, 0x42)
        }
    }

    bytes16 private constant HEX_DIGITS = '0123456789abcdef';

    function toString(uint256 value) internal pure returns (string memory) {
        uint256 length = log10(value) + 1;
        string memory buffer = new string(length);
        uint256 ptr;
        assembly {
            ptr := add(buffer, add(32, length))
        }
        while (true) {
            ptr--;
            assembly {
                mstore8(ptr, byte(mod(value, 10), HEX_DIGITS))
            }
            value /= 10;
            if (value == 0) break;
        }
        return buffer;
    }

    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;

        if (value >= 10 ** 64) {
            value /= 10 ** 64;
            result += 64;
        }
        if (value >= 10 ** 32) {
            value /= 10 ** 32;
            result += 32;
        }
        if (value >= 10 ** 16) {
            value /= 10 ** 16;
            result += 16;
        }
        if (value >= 10 ** 8) {
            value /= 10 ** 8;
            result += 8;
        }
        if (value >= 10 ** 4) {
            value /= 10 ** 4;
            result += 4;
        }
        if (value >= 10 ** 2) {
            value /= 10 ** 2;
            result += 2;
        }
        if (value >= 10 ** 1) {
            result += 1;
        }
        return result;
    }
}
