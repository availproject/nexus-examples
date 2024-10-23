// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusProofManager} from "nexus/interfaces/INexusProofManager.sol";
import {StorageProofVerifier, StorageProof} from "nexus/verification/zksync/StorageProof.sol";
import "forge-std/console.sol";

/// @notice Storage proof that proves a storage key-value pair is included in the batch
struct PaymentProof {
    uint64 batchNumber;
    // Account and key-value pair of its storage
    address account;
    bytes32 value;
    // Proof path and leaf index
    bytes32[] path;
    uint256 key;
    uint64 index;
}

contract MyNFT is ERC721 {
    mapping(uint256 => bytes32) confirmationReceipts;
    mapping(uint256 => bool) usedMessageid;

    uint256 private _tokenIds;
    INexusProofManager public nexus;
    StorageProofVerifier public storageProof;
    bytes32 immutable selfChainId;
    bytes32 immutable paymentChainID;

    struct Message {
        bytes1 messageType;
        bytes32 from;
        bytes data;
        uint256 messageId;
        uint256 chainId;
    }

    struct ConfirmationReciept {
        uint256 numberOfNFTs;
        uint256 messageId;
        address to;
    }

    event Confirmation(uint256 id, uint256 tokenId, address to);

    constructor(
        bytes32 _selfChainId,
        bytes32 _paymentChainID,
        INexusProofManager nexusManager,
        StorageProofVerifier _storageProof
    ) ERC721("MyNFT", "MNFT") {
        nexus = nexusManager;
        selfChainId = _selfChainId;
        paymentChainID = _paymentChainID;
        storageProof = _storageProof;
    }

    function mintNFT(
        address recipient,
        Message calldata message,
        PaymentProof calldata storageSlotTrieProof
    ) public returns (uint256) {
        require(
            !usedMessageid[message.messageId],
            "Message id already digested"
        );
        verifyPayment(storageSlotTrieProof);

        (address to, , ) = abi.decode(
            message.data,
            (address, uint256, uint256)
        );
        _tokenIds += 1;

        uint256 newItemId = _tokenIds;
        _safeMint(recipient, newItemId);

        ConfirmationReciept memory receipt = ConfirmationReciept(
            1,
            message.messageId,
            to
        );
        bytes32 hashedReceipt = keccak256(abi.encode(receipt));
        confirmationReceipts[newItemId] = hashedReceipt;
        usedMessageid[message.messageId] = true;
        emit Confirmation(newItemId, newItemId, recipient);
        return newItemId;
    }

    function verifyPayment(
        PaymentProof calldata storageSlotTrieProof
    ) public view {
        bool valid = storageProof.verify(
            StorageProof(
                storageSlotTrieProof.batchNumber,
                storageSlotTrieProof.account,
                storageSlotTrieProof.value,
                storageSlotTrieProof.path,
                storageSlotTrieProof.index
            ),
            storageSlotTrieProof.key
        );
        require(valid, "invalid storage proof");
    }
}
