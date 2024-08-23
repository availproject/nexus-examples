// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";
import {StorageProofVerifier, StorageProof} from "../../verification/zksync/StorageProof.sol";

contract MyNFT is ERC721 {
    mapping(uint256 => bytes32) confirmationReceipts;
    mapping(uint256 => bool) usedMessageid;

    uint256 private _tokenIds;
    INexusProofManager public nexus;
    StorageProofVerifier public storageProof;
    bytes32 immutable selfChainId;
    bytes32 immutable paymentChainID;
    address TARGET_CONTRACT_ADDRESS;
    bytes32 private constant EMPTY_TRIE_ROOT_HASH =
        0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421;

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

    event Confirmation(uint256 id);
    constructor(bytes32 _selfChainId, bytes32 _paymentChainID, INexusProofManager nexusManager, address targetContract, StorageProofVerifier _storageProof) ERC721("MyNFT", "MNFT") {
        nexus = nexusManager;
        selfChainId = _selfChainId;
        paymentChainID = _paymentChainID;
        TARGET_CONTRACT_ADDRESS = targetContract;
        storageProof = _storageProof;
    }

    function mintNFT(address recipient, Message calldata message, StorageProof calldata storageSlotTrieProof) public returns (uint256) {
        require(usedMessageid[message.messageId], "Message id already digested");
        verifyPayment(storageSlotTrieProof);
        (address to,,) = abi.decode(message.data, (address, uint256, uint256));
        _tokenIds += 1;
        uint256 newItemId = _tokenIds;
        _mint(recipient, newItemId);
        ConfirmationReciept memory receipt = ConfirmationReciept(1, message.messageId, to);
        bytes32 hashedReceipt = keccak256(abi.encode(receipt));
        confirmationReceipts[newItemId] = hashedReceipt;
        usedMessageid[message.messageId] = true;
        emit Confirmation(newItemId);
        return newItemId;
    }


    function verifyPayment(StorageProof calldata storageSlotTrieProof) public { 
        bool valid = storageProof.verify(storageSlotTrieProof);
        require(valid, "invalid storage proof");
    }
    
    // TODO: make only owner
    function updateTargetContract(address addr) public {
        TARGET_CONTRACT_ADDRESS = addr;
    }
}
