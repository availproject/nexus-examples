// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import {IERC20} from './interfaces/IERC20.sol';
import {IUniswapV3SwapCallback} from './interfaces/callback/IUniswapV3SwapCallback.sol';
import {INexusMailbox, MailboxMessage} from './interfaces/nexus/INexusMailbox.sol';
import {INexusReceiver} from './interfaces/nexus/INexusReceiver.sol';
import './interfaces/ISwapIntents.sol';
import {IUniswapMintable} from './interfaces/IUniswapMintable.sol';

contract SwapIntends is INexusReceiver, IUniswapV3SwapCallback {
    // 1. User can swap token0 to token1 based on a FEE for the solver.
    // 2. A submission request is picked up by the solver.
    // 3. The order is send to the nexus mailbox.
    // 4. The solver in the meanwhile trades the token0 to token1 -> requires a solver swap function in V3Pool
    // 5. The locks the equivalent amount of token1 in this contract.
    // 6. After the message is received from the mailbox, the contract will send the token1 to the user and the token0 to the solver.

    bytes32 private constant _PETITION_TYPEHASH =
        keccak256(
            'Petition(Compact compact,Mandate mandate)Compact(address sponsor,uint256 nonce,address token0,uint256 amount,uint256 feeTier,uint256 stake)Mandate(bytes32 nexusTargetID,address token1,uint256 minimumAmount,uint256 expires,address receiver,bytes32 salt)'
        );

    bytes32 private constant _SWAP_ORDER_TYPEHASH =
        keccak256(
            'SwapOrder(address arbiter,Compact compact,Mandate mandate,uint256 amountLocked)Compact(address sponsor,uint256 nonce,address token0,uint256 amount,uint256 feeTier,uint256 stake)Mandate(bytes32 nexusTargetID,address token1,uint256 minimumAmount,uint256 expires,address receiver,bytes32 salt)'
        );

    event PetitionCreated(bytes32 orderHash, Compact compact, Mandate mandate);
    event SwapOrderAccepted(bytes32 orderHash, SwapOrder order);

    uint256 constant BASIS_POINTS = 10000;

    mapping(bytes32 => bool) public swapOrderFilled;
    mapping(bytes32 => bool) public publishedPetisions;
    mapping(uint256 => uint256) public solverFeeTiers;
    mapping(bytes32 => SwapOrder) public swapOrders;
    mapping(bytes32 => Petition) public petitions;
    mapping(bytes32 => ResolvedCrossChainOrder) public resolvedSwapOrders;

    mapping(bytes32 => mapping(address => address)) destinationToSourceMapping;
    INexusMailbox mailbox;
    IUniswapMintable mintContract;

    constructor(INexusMailbox _mailbox, IUniswapMintable _mintContract) {
        mailbox = _mailbox;
        mintContract = _mintContract;
    }

    function getDestinationToSourceMapping(
        bytes32 nexusAppID,
        address destinationToken
    ) external view returns (address) {
        return destinationToSourceMapping[nexusAppID][destinationToken];
    }

    function setDestinationToSourceMapping(bytes32 nexusAppID, address sourceToken, address destinationToken) external {
        destinationToSourceMapping[nexusAppID][destinationToken] = sourceToken;
    }
    // TODO: add minting logic
    function petition(
        Compact calldata compact,
        Mandate calldata mandate,
        uint256 orderDealine
    ) external payable returns (bytes32 mandateHash, uint256 settlementAmount, uint256 claimAmount) {
        // 1. User can creates a swap intend with max slippage percentage and fee tier.
        // 2. User locks the token0 amount in this contract.
        // 3. The price for the swap is determined using an

        require(compact.sponsor == msg.sender, 'Invalid sender');
        require(mandate.expires >= block.timestamp, 'Invalid expiry');

        bytes32 orderHash = derivePetitionHash(compact, mandate);

        publishedPetisions[orderHash] = true;

        petitions[orderHash] = Petition({compact: compact, mandate: mandate});

        emit PetitionCreated(orderHash, compact, mandate);
    }

    function acceptSwapOrder(bytes32 petitionHash) external {
        require(!swapOrderFilled[petitionHash], 'Already in progress');
        Petition memory storedPetition = petitions[petitionHash];

        uint256 stake = storedPetition.compact.stake;
        address tokenAddress = storedPetition.compact.token0;

        IERC20(destinationToSourceMapping[storedPetition.mandate.nexusTargetID][tokenAddress]).transferFrom(
            msg.sender,
            address(this),
            stake
        );

        // 1. The solver accepts the swap order.
        SwapOrder memory order = SwapOrder({
            arbiter: msg.sender,
            compact: storedPetition.compact,
            mandate: storedPetition.mandate,
            amountLocked: stake,
            orderID: petitionHash,
            processor: address(this)
        });

        swapOrders[petitionHash] = order;

        emit SwapOrderAccepted(petitionHash, order);

        // ( 2. The solver swaps the token0 to token1 on the liquidity chain
        // 3. The solver locks the equivalent amount of token1 ( with maximum upward slippage) in this contract. )
        // 4. The solver fee is deducted from the amount of token1 locked.
        // 5. If the proof of fill against a solver is provided, the solver can withdraw the token0.
        // 6. When accepting an order, the solver gives a "stake" as a commitment to the order.
    }

    function fillSwapOrder(
        uint256 swapOrderIndex,
        uint256 chainBlockNumber,
        MailboxMessage calldata message,
        bytes memory proof
    ) external {
        mailbox.receiveMessage(chainBlockNumber, message, proof);
        // 1. The user or the solver can provide a proof of inclusion of the swap order in messages from uniswap.
        // 2. The contract will send the token1 to the user and the token0 to the solver.
    }

    function derivePetitionHash(Compact memory compact, Mandate memory mandate) public view returns (bytes32) {
        return keccak256(abi.encode(_PETITION_TYPEHASH, compact, mandate));
    }

    function deriveSwapOrderHash(SwapOrder memory order) public view returns (bytes32) {
        return keccak256(abi.encode(_SWAP_ORDER_TYPEHASH, order));
    }

    function onNexusMessage(
        bytes32 nexusAppIDFrom,
        address from,
        bytes calldata data,
        uint256 nonce
    ) external override {
        OnchainCrossChainOrder memory crossChainOrder = abi.decode(data, (OnchainCrossChainOrder));
        ResolvedSwapOrder memory order = abi.decode(crossChainOrder.orderData, (ResolvedSwapOrder));

        // Additional check to ensure that order is for minting or just for unlocking to the solver ( later case being when the destination of swap is the liquidity chain)

        SwapOrder memory storedOrderInfo = swapOrders[order.orderID];
        // 1. verify the filled data
        require(crossChainOrder.fillDeadline > block.timestamp, 'Invalid expiry');
        require(storedOrderInfo.arbiter != address(0), 'Invalid arbiter');

        uint256 solverFee = (storedOrderInfo.compact.feeTier * storedOrderInfo.compact.amount) / BASIS_POINTS;

        if (order.zeroForOne) {
            mintContract.mint(
                destinationToSourceMapping[storedOrderInfo.mandate.nexusTargetID][storedOrderInfo.mandate.token1],
                address(uint160(uint256(order.recipient))),
                uint256(-order.amount1)
            );

            IERC20(destinationToSourceMapping[storedOrderInfo.mandate.nexusTargetID][storedOrderInfo.compact.token0])
                .transferFrom(storedOrderInfo.compact.sponsor, storedOrderInfo.arbiter, uint256(order.amount0));
        } else {
            mintContract.mint(
                destinationToSourceMapping[storedOrderInfo.mandate.nexusTargetID][storedOrderInfo.compact.token0],
                address(uint160(uint256(order.recipient))),
                uint256(-order.amount0)
            );

            IERC20(destinationToSourceMapping[storedOrderInfo.mandate.nexusTargetID][storedOrderInfo.mandate.token1])
                .transferFrom(storedOrderInfo.compact.sponsor, storedOrderInfo.arbiter, uint256(order.amount1));
        }

        // TODO: Too many storage writes. Optimize this.
        ResolvedCrossChainOrder storage resolvedSwapOrder = resolvedSwapOrders[order.orderID];
        // Create the resolution message
        Output[] storage maxSpent = resolvedSwapOrder.maxSpent;
        Output[] storage minReceived = resolvedSwapOrder.minReceived;
        FillInstruction[] storage fillInstructions = resolvedSwapOrder.fillInstructions;
        maxSpent.push(); // This creates the first element at index 0
        minReceived.push();
        fillInstructions.push();

        maxSpent[0] = Output({
            token: order.token,
            amount: order.zeroForOne ? order.amount1 : order.amount0,
            recipient: order.recipient,
            chainId: order.chainId
        });

        minReceived[0] = Output({
            token: bytes32(
                uint256(uint160(order.zeroForOne ? storedOrderInfo.compact.token0 : storedOrderInfo.mandate.token1))
            ),
            amount: order.zeroForOne ? order.amount0 : order.amount1,
            recipient: bytes32(uint256(uint160(storedOrderInfo.arbiter))),
            chainId: order.chainId
        });

        fillInstructions[0] = FillInstruction({
            destinationChainId: uint64(uint256(order.destinationChainId)),
            destinationSettler: order.destinationSettler,
            originData: ''
        });

        resolvedSwapOrders[order.orderID].user = address(uint160(uint256(order.recipient)));
        resolvedSwapOrders[order.orderID].originChainId = order.chainId;
        resolvedSwapOrders[order.orderID].openDeadline = block.timestamp;
        resolvedSwapOrders[order.orderID].fillDeadline = crossChainOrder.fillDeadline;
        resolvedSwapOrders[order.orderID].maxSpent = maxSpent;
        resolvedSwapOrders[order.orderID].minReceived = minReceived;
        resolvedSwapOrders[order.orderID].fillInstructions = fillInstructions;

        swapOrderFilled[order.orderID] = true;
    }

    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external override {}
}
