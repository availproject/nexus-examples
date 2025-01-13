// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {AccessControlDefaultAdminRulesUpgradeable} from "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlDefaultAdminRulesUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IAvail} from "./interfaces/IAvail.sol";
import {Merkle} from "./lib/Merkle.sol";
import {IMessageReceiver} from "./interfaces/IMessageReceiver.sol";
import {INexusBridge} from "./interfaces/INexusBridge.sol";
import {EthereumVerifier} from "nexus/verification/ethereum/Verifier.sol";
import {INexusProofManager} from "nexus/interfaces/INexusProofManager.sol";
import {INexusMailbox} from "nexus/interfaces/INexusMailbox.sol";
import {INexusReceiver} from "nexus/interfaces/INexusReceiver.sol";

contract NexusLockMintBridge is
    Initializable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    AccessControlDefaultAdminRulesUpgradeable,
    INexusBridge,
    INexusReceiver
{
    using Merkle for bytes32[];
    using SafeERC20 for IERC20;

    // map message hashes to their message ID, used for Ethereum -> Avail messages
    mapping(uint256 => bytes32) public isSent;
    // map store spent message hashes, used for Avail -> Ethereum messages
    mapping(bytes32 => bool) public isBridged;
    // map asset IDs to nexus asset addresses on given chain
    mapping(bytes32 => address) public nexusTokens;

    IAvail public avail;

    INexusMailbox public mailbox;

    address public feeRecipient;
    uint256 public fees; // total fees accumulated by bridge
    uint256 public messageId; // next nonce

    bytes32 private constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    modifier checkDestAmt(bytes32 dest, uint256 amount) {
        if (dest == 0x0 || amount == 0 || amount > type(uint128).max) {
            revert InvalidDestinationOrAmount();
        }
        _;
    }

    /**
     * @notice  Initializes the AvailBridge contract
     * @param   newFeeRecipient  New fee recipient address
     * @param   newAvail  Address of the AVAIL token contract
     * @param   governance  Address of the governance multisig
     * @param   pauser  Address of the pauser multisig
     */
    function initialize(
        address newFeeRecipient,
        IAvail newAvail,
        address governance,
        address pauser,
        INexusMailbox _nexusMailbox
    ) external initializer {
        // slither-disable-next-line missing-zero-check
        feeRecipient = newFeeRecipient;

        avail = newAvail;

        mailbox = _nexusMailbox;
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
     * @notice  Function to update asset ID -> token address mapping for nexus tokens
     * @dev     Only callable by governance
     * @param   assetIds  Asset IDs to update
     * @param   tokenAddresses  Token addresses to update
     */
    function updateNexusTokens(
        bytes32[] calldata assetIds,
        address[] calldata tokenAddresses
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = assetIds.length;
        if (length != tokenAddresses.length) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i = 0; i < length; ) {
            nexusTokens[assetIds[i]] = tokenAddresses[i];
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice  Function to update the fee recipient
     * @dev     Only callable by governance
     * @param   newFeeRecipient  New fee recipient address
     */
    function updateFeeRecipient(
        address newFeeRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
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
        (bool success, ) = feeRecipient.call{value: fee}("");
        if (!success) {
            revert WithdrawFailed();
        }
    }
    function _receiveERC20(Message memory message) internal {
        (bytes32 assetId, uint256 value) = abi.decode(
            message.data,
            (bytes32, uint256)
        );

        address token = nexusTokens[assetId];
        if (token != address(0)) {
            // revert to message.to later
            address dest = address(uint160(uint256(message.to)));

            IAvail(token).mint(dest, value);
            return;
        }
        revert InvalidAssetId();
    }

    /**
     * @notice  Bridges ERC20 tokens to the specified recipient on Avail
     * @dev     This function is used for ERC20 transfers from Ethereum to Avail
     * @param   assetId  Asset ID of the ERC20 token
     * @param   recipient  Recipient of the asset on Avail
     * @param   amount  Amount of ERC20 tokens to bridge
     */
    function sendERC20(
        bytes32 assetId,
        bytes32 recipient,
        uint256 amount,
        bytes32[] calldata destination,
        uint256 nonce,
        address[] calldata destinationMailboxAddress
    ) external whenNotPaused checkDestAmt(recipient, amount) {
        address token = nexusTokens[assetId];
        if (token == address(0)) revert InvalidAssetId();

        uint256 id;
        unchecked {
            id = messageId++;
        }

        Message memory message = Message(
            bytes32(bytes20(msg.sender)),
            recipient,
            abi.encode(assetId, amount),
            uint64(id)
        );

        // store message hash to be retrieved later by our light client
        isSent[id] = keccak256(abi.encode(message));

        bytes memory data = abi.encode(message);
        mailbox.sendMessage(
            destination,
            destinationMailboxAddress,
            nonce,
            data
        );

        emit MessageSent(msg.sender, recipient, id);
        IAvail(token).burn(msg.sender, amount);
    }

    function onNexusMessage(
        bytes32 nexusAppIDFrom,
        address sender,
        bytes memory data,
        uint256 nonce
    ) public override {
        revert("Unreachable");
        require(
            msg.sender == address(mailbox),
            "Only valid messages from nexus mailbox are acceptable"
        );

        Message memory message = abi.decode(data, (Message));

        _receiveERC20(message);
    }
}
