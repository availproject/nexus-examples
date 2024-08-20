// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";

contract MyNFT is ERC721 {
    mapping(uint256 => bytes32) confirmationReceipts;
    mapping(uint256 => bool) usedMessageid;

    uint256 private _tokenIds;
    INexusProofManager public nexus;
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
    constructor(bytes32 _selfChainId, bytes32 _paymentChainID, INexusProofManager nexusManager, address targetContract) ERC721("MyNFT", "MNFT") {
        nexus = nexusManager;
        selfChainId = _selfChainId;
        paymentChainID = _paymentChainID;
        TARGET_CONTRACT_ADDRESS = targetContract;
    }

    function mintNFT(address recipient, Message calldata message, bytes32 paymentChainBlockNumber,bytes calldata accountTrieProof,bytes32 slot,bytes calldata storageSlotTrieProof) public returns (uint256) {
        require(usedMessageid[message.messageId], "Message id already digested");
        verifyPayment(keccak256(abi.encode(message)), paymentChainBlockNumber, accountTrieProof, slot, storageSlotTrieProof);
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


    function verifyPayment(bytes32 leaf, bytes32 paymentChainBlockNumber,bytes calldata accountTrieProof, bytes32 slot,bytes calldata storageSlotTrieProof) public { 
        bytes32 state = nexus.getChainState(0, paymentChainBlockNumber); 
        (, , , bytes32 storageRoot) = nexus.verifyAccount(state, accountTrieProof, TARGET_CONTRACT_ADDRESS);
        require(storageRoot != EMPTY_TRIE_ROOT_HASH, "invalid entry");
        bytes32 slotValue = nexus.verifyStorage(storageRoot, slot, storageSlotTrieProof); 
        require(slotValue == leaf, "leaf value not the same");
    }
    
    // TODO: make only owner
    function updateTargetContract(address addr) public {
        TARGET_CONTRACT_ADDRESS = addr;
    }
}
