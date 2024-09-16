// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from
    "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from
    "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAvail} from "./interfaces/IAvail.sol";
import {Merkle} from "./lib/Merkle.sol";
import {IMessageReceiver} from "./interfaces/IMessageReceiver.sol";
import {INexusBridge} from "./interfaces/INexusBridge.sol";
import {INexusProofManager} from "../../interfaces/INexusProofManager.sol";
import {EthereumVerifier} from "../../verification/ethereum/Verifier.sol";


contract NexusBridge is
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlDefaultAdminRulesUpgradeable,
    INexusBridge
{
    using Merkle for bytes32[];
    using SafeERC20 for IERC20;

    // map message hashes to their message ID, used for Ethereum -> Avail messages
    mapping(uint256 => bytes32) public isSent;
    // map store spent message hashes, used for Avail -> Ethereum messages
    mapping(bytes32 => bool) public isBridged;
    // map asset IDs to an Respective chain's address
    mapping(bytes32 => address) public tokens;
    // map asset IDs to nexus asset addresses on given chain
    mapping(bytes32 => address) public nexusTokens; 

    IAvail public avail;
    INexusProofManager public nexus;
    EthereumVerifier public verifier;
    address public feeRecipient;
    uint256 public fees; // total fees accumulated by bridge
    uint256 public feePerByte; // in wei
    uint256 public messageId; // next nonce
    bytes32 public chainId;

    bytes1 private constant MESSAGE_TX_PREFIX = 0x01;
    bytes1 private constant TOKEN_TX_PREFIX = 0x02;

    uint256 private constant MAX_DATA_LENGTH = 102_400;
    // Derived from abi.encodePacked("ETH")
    // slither-disable-next-line too-many-digits
    bytes32 private constant ETH_ASSET_ID = 0x4554480000000000000000000000000000000000000000000000000000000000;
    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
     bytes32 private constant EMPTY_TRIE_ROOT_HASH =
        0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421;
    bytes32 private constant EMPTY_CODE_HASH =
        0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;


    modifier onlyTokenTransfer(bytes1 messageType) {
        if (messageType != TOKEN_TX_PREFIX) {
            revert InvalidFungibleTokenTransfer();
        }
        _;
    }

    modifier checkDestAmt(bytes32 dest, uint256 amount) {
        if (dest == 0x0 || amount == 0 || amount > type(uint128).max) {
            revert InvalidDestinationOrAmount();
        }
        _;
    }

    /**
     * @notice  Initializes the AvailBridge contract
     * @param   newFeePerByte  New fee per byte value
     * @param   newFeeRecipient  New fee recipient address
     * @param   newAvail  Address of the AVAIL token contract
     * @param   governance  Address of the governance multisig
     * @param   pauser  Address of the pauser multisig
     */
    function initialize(
        uint256 newFeePerByte,
        address newFeeRecipient,
        IAvail newAvail,
        address governance,
        address pauser,
        INexusProofManager nexusStateManager,
        bytes32 currentChainId,
        EthereumVerifier _verifier
      
    ) external initializer {
        feePerByte = newFeePerByte;
        // slither-disable-next-line missing-zero-check
        feeRecipient = newFeeRecipient;
      
        avail = newAvail;
        nexus = nexusStateManager;
        chainId = currentChainId;
        verifier = _verifier;
        __AccessControlDefaultAdminRules_init(0, governance);
        _grantRole(PAUSER_ROLE, pauser);
        __Pausable_init();
        __ReentrancyGuard_init();
    }

    /**
     * @notice  Updates pause status of the bridge
     * @param   status  New pause status
     */
    function setPaused(bool status) external onlyRole(PAUSER_ROLE) {
        if (status) {
            _pause();
        } else {
            _unpause();
        }
    }

 
    /**
     * @notice  Function to update asset ID -> token address mapping
     * @dev     Only callable by governance
     * @param   assetIds  Asset IDs to update
     * @param   tokenAddresses  Token addresses to update
     */
    function updateTokens(bytes32[] calldata assetIds, address[] calldata tokenAddresses)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 length = assetIds.length;
        if (length != tokenAddresses.length) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i = 0; i < length;) {
            require(nexusTokens[assetIds[i]] == address(0), "asset id used by nexus tokens");
            tokens[assetIds[i]] = tokenAddresses[i];
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice  Function to update asset ID -> token address mapping for nexus tokens
     * @dev     Only callable by governance
     * @param   assetIds  Asset IDs to update
     * @param   tokenAddresses  Token addresses to update
     */
    function updateNexusTokens(bytes32[] calldata assetIds, address[] calldata tokenAddresses)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        uint256 length = assetIds.length;
        if (length != tokenAddresses.length) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i = 0; i < length;) {
            require(tokens[assetIds[i]] == address(0), "asset id used by standard tokens");
            nexusTokens[assetIds[i]] = tokenAddresses[i];
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice  Function to update the fee per byte value
     * @dev     Only callable by governance
     * @param   newFeePerByte  New fee per byte value
     */
    function updateFeePerByte(uint256 newFeePerByte) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feePerByte = newFeePerByte;
    }

    /**
     * @notice  Function to update the fee recipient
     * @dev     Only callable by governance
     * @param   newFeeRecipient  New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // slither-disable-next-line missing-zero-check
        feeRecipient = newFeeRecipient;
    }

    /**
     * @notice  Function to withdraw fees to the fee recipient
     * @dev     Callable by anyone because all fees are always sent to the recipient
     */
    function withdrawFees() external {
        uint256 fee = fees;
        delete fees;
        // slither-disable-next-line low-level-calls
        (bool success,) = feeRecipient.call{value: fee}("");
        if (!success) {
            revert WithdrawFailed();
        }
    }

    /**
     * @notice  Takes an arbitrary message and its proof of inclusion, verifies and executes it (if valid)
     * @dev     This function is used for passing arbitrary data from Avail to Ethereum
     * @param   message  Message that is used to reconstruct the bridge leaf
     * @param   input  Merkle tree proof of inclusion for the bridge leaf
     */
    function receiveMessage(MessageReceieve calldata message, bytes calldata input)
        external
        whenNotPaused
        nonReentrant
    {
        if (message.messageType != MESSAGE_TX_PREFIX) {
            revert InvalidMessage();
        }
     
        _checkInclusionAgainstStateRoot(message, input);
        
        // downcast SCALE-encoded bytes to an Ethereum address
        address dest = address(bytes20(message.to));
        // IMessageReceiver(dest).onAvailMessage(message.from, message.data);

        emit MessageReceived(message.from, dest, message.messageId);
    }

    /**
     * @notice  Takes an ETH transfer message and its proof of inclusion, verifies and executes it (if valid)
     * @dev     This function is used for ETH transfers from Avail to Ethereum
     * @param   message  Message that is used to reconstruct the bridge leaf
     * @param   input  Merkle tree proof of inclusion for the bridge leaf
     */
    function receiveETH(MessageReceieve calldata message, bytes calldata input)
        external
        whenNotPaused
        onlyTokenTransfer(message.messageType)
        nonReentrant
    {
        (bytes32 assetId, uint256 value) = abi.decode(message.data, (bytes32, uint256));
 
        _checkInclusionAgainstStateRoot(message, input);

        // downcast SCALE-encoded bytes to an Ethereum address
        // revert to message.to later
        address dest = address(uint160(uint256(message.from)));

        emit MessageReceived(message.from, dest, message.messageId);

        if(nexusTokens[assetId] != address(0)) {
            IAvail(nexusTokens[assetId]).mint(dest, value);
            return;
        }
        
        // slither-disable-next-line arbitrary-send-eth,missing-zero-check,low-level-calls
        (bool success,) = dest.call{value: value}("");
        if (!success) {
            revert UnlockFailed();
        }
    }

    /**
     * @notice  Takes an ERC20 transfer message and its proof of inclusion, verifies and executes it (if valid)
     * @dev     This function is used for ERC20 transfers from Avail to Ethereum
     * @param   message  Message that is used to reconstruct the bridge leaf
     * @param   input  Merkle tree proof of inclusion for the bridge leaf
     */
    function receiveERC20(MessageReceieve calldata message, bytes calldata input)
        external
        whenNotPaused
        onlyTokenTransfer(message.messageType)
        nonReentrant
    {
        (bytes32 assetId, uint256 value) = abi.decode(message.data, (bytes32, uint256));
        address token = tokens[assetId];
        if (token != address(0)) {
             _checkInclusionAgainstStateRoot(message, input);

            // revert to message.to later
            address dest = address(uint160(uint256(message.from)));

            emit MessageReceived(message.from, dest, message.messageId);

            
            IERC20(token).safeTransfer(dest, value);
            return;
        }
        token = nexusTokens[assetId];
        if(token != address(0)) {
            _checkInclusionAgainstStateRoot(message, input);

            // revert to message.to later
            address dest = address(uint160(uint256(message.from)));

            emit MessageReceived(message.from, dest, message.messageId);

            IAvail(token).mint(dest, value);
            return;
        }             
        revert InvalidAssetId();  
    }

    /**
     * @notice  Emits a corresponding arbitrary messag event on Avail
     * @dev     This function is used for passing arbitrary data from Ethereum to Avail
     * @param   recipient  Recipient of the message on Avail
     * @param   data  Data to send
     */
    function sendMessage(bytes32 recipient, bytes calldata data) external payable whenNotPaused {
        uint256 length = data.length;
        if (length == 0 || length > MAX_DATA_LENGTH) {
            revert InvalidDataLength();
        }
        // ensure that fee is above minimum amount
        if (msg.value < getFee(length)) {
            revert FeeTooLow();
        }
        uint256 id;
        unchecked {
            id = messageId++;
        }
        fees += msg.value;
        Message memory message = Message(
            MESSAGE_TX_PREFIX, bytes32(bytes20(msg.sender)), recipient, data, uint64(id)
        );
        // store message hash to be retrieved later by our light client
        isSent[id] = keccak256(abi.encode(message));

        emit MessageSent(msg.sender, recipient, id);
    }

    /**
     * @notice  Bridges ETH to the specified recipient on Avail
     * @dev     This function is used for ETH transfers from Ethereum to Avail
     * @param   recipient  Recipient of the ETH on Avail
     */
    function sendETH(bytes32 recipient) external payable whenNotPaused checkDestAmt(recipient, msg.value) {
        uint256 id;
        unchecked {
            id = messageId++;
        }
        Message memory message = Message(
            TOKEN_TX_PREFIX,
            bytes32(bytes20(msg.sender)),
            recipient,
            abi.encode(ETH_ASSET_ID, msg.value),
            uint64(id)
        );
        // store message hash to be retrieved later by our light client
        isSent[id] = keccak256(abi.encode(message));

        emit MessageSent(msg.sender, recipient, id);
    }

    /**
     * @notice  Bridges ERC20 tokens to the specified recipient on Avail
     * @dev     This function is used for ERC20 transfers from Ethereum to Avail
     * @param   assetId  Asset ID of the ERC20 token
     * @param   recipient  Recipient of the asset on Avail
     * @param   amount  Amount of ERC20 tokens to bridge
     */
    function sendERC20(bytes32 assetId, bytes32 recipient, uint256 amount)
        external
        whenNotPaused
        checkDestAmt(recipient, amount)
    {
        address token = tokens[assetId];
        if (token != address(0)) {
           
            uint256 id;
            unchecked {
                id = messageId++;
            }
            Message memory message = Message(
                TOKEN_TX_PREFIX,
                bytes32(bytes20(msg.sender)),
                recipient,
                abi.encode(assetId, amount),
                uint64(id)
            );
            // store message hash to be retrieved later by our light client
            isSent[id] = keccak256(abi.encode(message));

            emit MessageSent(msg.sender, recipient, id);

            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            return;
           
        }
        
        token = nexusTokens[assetId];
        if(token != address(0)){ 
            uint256 id;
            unchecked {
                id = messageId++;
            }
            Message memory message = Message(
                TOKEN_TX_PREFIX,
                bytes32(bytes20(msg.sender)),
                recipient,
                abi.encode(assetId, amount),
                uint64(id)
            );
            // store message hash to be retrieved later by our light client
            isSent[id] = keccak256(abi.encode(message));

            emit MessageSent(msg.sender, recipient, id);

            IAvail(token).burn(msg.sender, amount);
            return;
        }

        revert InvalidAssetId();
    }


    /**
     * @notice  Returns the minimum fee for a given message length
     * @param   length  Length of the message (in bytes)
     * @return  uint256  The minimum fee
     */
    function getFee(uint256 length) public view returns (uint256) {
        return length * feePerByte;
    }

    function _checkInclusionAgainstStateRoot(MessageReceieve calldata message, bytes calldata proof) private {
        bytes32 state = nexus.getChainState(0, chainId); 
        (, , , bytes32 storageRoot) = verifier.verifyAccount(state, proof, address(uint160(uint256(message.to))));
        require(storageRoot != EMPTY_TRIE_ROOT_HASH, "invalid entry");
        bytes32 value = verifier.verifyStorage(storageRoot, message.storageSlot, message.storageProof);
        require(value == message.slotValue, "Invalid slot value");
    } 
}