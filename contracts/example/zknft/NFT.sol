// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";

contract MyNFT is ERC721 {
    uint256 private _tokenIds;
    INexusProofManager public nexus;
    uint256 immutable selfChainId;
    bytes32 immutable paymentChainID;
    bytes32 private constant EMPTY_TRIE_ROOT_HASH =
        0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421;
    constructor(uint256 _selfChainId, bytes32 _paymentChainID, INexusProofManager nexusManager) ERC721("MyNFT", "MNFT") {
        nexus = nexusManager;
        selfChainId = _selfChainId;
        paymentChainID = _paymentChainID;
    }

    function mintNFT(address recipient, uint256 paymentChainBlockNumber,bytes calldata accountTrieProof,bytes32 slot,bytes calldata storageSlotTrieProof) public returns (uint256) {
        verifyPayment(recipient, paymentChainBlockNumber, accountTrieProof, slot, storageSlotTrieProof);
        _tokenIds += 1;
        uint256 newItemId = _tokenIds;
        _mint(recipient, newItemId);
        return newItemId;
    }

    function verifyPayment(address recipient, uint256 paymentChainBlockNumber,bytes calldata accountTrieProof, bytes32 slot,bytes calldata storageSlotTrieProof) view public { 
        bytes32 storageRoot = nexus.getStorageRoot(paymentChainID, paymentChainBlockNumber, recipient, accountTrieProof);
        require(storageRoot!= EMPTY_TRIE_ROOT_HASH, "No storage root available");
        bytes32 slotValue = nexus.verifyStorage(storageRoot, slot, storageSlotTrieProof);
        // check slot value is not empty
    }
}
