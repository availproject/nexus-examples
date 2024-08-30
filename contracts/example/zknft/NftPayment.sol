// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";
import {Payment} from "./Payment.sol";
import {EthereumVerifier} from "../../verification/ethereum/Verifier.sol";
contract NFTPayment is Payment, EthereumVerifier {
    INexusProofManager public nexus;

    uint256 CLAIM_TIME = 86400; // 1 day
    address immutable FIXED_PAYOUT_ADDRESS;
    address immutable TARGET_CONTRACT_ADDRESS;
    uint256 claimCounter = 0;

    bytes32 private constant EMPTY_TRIE_ROOT_HASH =
        0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421;


    mapping(address => uint256) payoutPrice;
    PendingPayment[] pendingPayouts;

    struct PendingPayment {
        address to;
        uint256 amount;
        address tokenAddress;
        uint256 timestamp;
    }

    event PendingPayout( 
        uint256 index,
        address to
    );

    constructor(INexusProofManager nexusManager, address fixedPayoutAddress, address targetContractAddress) EthereumVerifier(
        nexusManager
    ) {
        nexus = nexusManager;
        FIXED_PAYOUT_ADDRESS = fixedPayoutAddress;
        TARGET_CONTRACT_ADDRESS = targetContractAddress;
    }

    function paymentWithoutFallback(bytes1 messageType, uint256 chainId, uint256 amount, address payoutToken) public {
        uint256 price = payoutPrice[payoutToken];
        require(price > 0, "Invalid token");
        require(amount > price, "Invalid amount");
        uint256 units = amount / price;
        IERC20(payoutToken).transferFrom(msg.sender, FIXED_PAYOUT_ADDRESS, price * units);
        bytes memory data = abi.encode(FIXED_PAYOUT_ADDRESS,price*units, units);
        uint256 messageId = claimCounter++;
        Message memory message = Message( 
            messageType,
            bytes32(uint256(uint160(msg.sender))),
            data,
            claimCounter,
            chainId
        );
  
        _store(messageId, keccak256(abi.encode(message)));
        emit PreImage(
            messageType, 
            bytes32(uint256(uint160(msg.sender))),
            data,
            messageId,
            chainId
        );
    }

    function paymentWithFallback(bytes1 messageType, uint256 chainId, uint256 amount, address payoutToken) public returns (uint256) {
        uint256 price = payoutPrice[payoutToken];
        require(price > 0, "Invalid token");
        require(amount > price, "Invalid amount");
        uint256 units = amount / price;
        IERC20(payoutToken).transferFrom(msg.sender, address(this), price * units);
        PendingPayment memory pendingReceipt = PendingPayment(
            msg.sender,
            price*units,
            payoutToken,
            block.timestamp // insecure
        );
        pendingPayouts.push(pendingReceipt);
        uint256 index = pendingPayouts.length;
        bytes memory data = abi.encode(FIXED_PAYOUT_ADDRESS,price*units, units);
        uint256 messageId = claimCounter++;
        Message memory message = Message( 
            messageType,
            bytes32(uint256(uint160(address(this)))),
            data,
            claimCounter,
            chainId
        );
 
        _store(messageId, keccak256(abi.encode(message)));
        emit PreImage(
            messageType, 
            bytes32(uint256(uint160(address(this)))),
            data,
            messageId,
            chainId
        );
        emit PendingPayout(
            index, 
            msg.sender
        );
        return index;
    }

    function claimPayment(uint256 index) public {
        PendingPayment memory receipt = pendingPayouts[index];
        require(receipt.timestamp + CLAIM_TIME > block.timestamp,"Not allowed yet to claim");
        IERC20(receipt.tokenAddress).transfer(receipt.to, receipt.amount);
        delete pendingPayouts[index];
    }

    
    function verifyPayment(bytes32 paymentChainBlockNumber,bytes calldata accountTrieProof, bytes32 slot,bytes calldata storageSlotTrieProof) public { 
        bytes32 state = nexus.getChainState(0, paymentChainBlockNumber); 
        (, , , bytes32 storageRoot) = verifyAccount(state, accountTrieProof, TARGET_CONTRACT_ADDRESS);
        require(storageRoot != EMPTY_TRIE_ROOT_HASH, "invalid entry");
        verifyStorage(storageRoot, slot, storageSlotTrieProof); 
    }

    // only admin
    function updatePrice(address token, uint256 price) public { 
        payoutPrice[token] = price;
    }
}