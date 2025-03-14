// chain 1
// Deployment Summary:
// -------------------
// TestERC20 (token0): 0xBBd762EEd7479CC9D281DeA59ea9DBc35e162ec3
// TestERC20 (token1): 0xcA993298Be3DbCAf119776281EF503c88135D67E
// Deploying MockNexusLockAndMint...
// MockNexusLockAndMint deployed to: 0x5C9826a289b39d91D74dCb7819fB03015f2b35fc
// Deploying SwapIntends...
// SwapIntends deployed to: 0x0CE9056a4885E584DD9043d88f17CcA36Ed2500b
// MockNexusLockAndMint: 0x5C9826a289b39d91D74dCb7819fB03015f2b35fc
// SwapIntends: 0x0CE9056a4885E584DD9043d88f17CcA36Ed2500b

// chain 2
// TestERC20 (token0) deployed to: 0xB60cbba0Ca41aC92FF26378572caaf3E616dE71C
// TestERC20 (token1) deployed to: 0x93c064Cb0dd5321C26511d828CeDE2506a828Bb9
// UniswapV3Pool deployed to: 0x21bF2451315330934dC502320267cE66702d20f5
// UniswapV3Factory deployed to: 0xB3F341Eb505c0fE57A26576DbAb805E7a4aA182b
// MockTimeUniswapV3PoolDeployer deployed to: 0x596aBA7bE76FDE6C51Ca428cAb7Fa4Ad25DAf8cC
// Deploying MockTimeUniswapV3Pool...
// emitted event Result(1) [ '0x3De1C0B50424c5D1Db7D00509cBb6b00Cd4Ac82b' ]
// Pool deployed to: 0x3De1C0B50424c5D1Db7D00509cBb6b00Cd4Ac82b
// Deploying UniswapV3PoolSwapTest...
// UniswapV3PoolSwapTest deployed to: 0x3b554FE53235F0A025545f2Bba1e2c9e0Ce98007
// Deploying CrossChainIntentEscrow...
// CrossChainIntentEscrow deployed to: 0x29461F701a36a6942c12f37756668d154262F6F2

// Deployment Summary:
// -------------------
// TestERC20 (token0): 0xB60cbba0Ca41aC92FF26378572caaf3E616dE71C
// TestERC20 (token1): 0x93c064Cb0dd5321C26511d828CeDE2506a828Bb9
// UniswapV3PoolSwapTest: 0x3b554FE53235F0A025545f2Bba1e2c9e0Ce98007
// CrossChainIntentEscrow: 0x29461F701a36a6942c12f37756668d154262F6F2

import { Provider, Wallet } from 'zksync-ethers'

const config = {
  source: {
    chainID: 271,
    url: 'https://zksync1.nexus.avail.tools',
    token0: '0x3234b9350d2917189041C08ea6Cf6b4252497C17',
    token1: '0xDfE348A499A63F3AA6172681A961d1B7F97a33d7',
    mockNexusLockAndMint: '0x65cb25401f6aEDb5881a630aFCdE7a45d86D6001',
    swapIntends: '0xA65523549F782fC6B7FCe49d039D514fFFC2E9C2',
    appId: '0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e',
    nexusProofManager: '0x3a67d837e77e36B01F58E449c200A5E90dFf3635',
    mailboxContract: '0xa3a651000B2Fd9b1cC4e90525Ec92468EFA90C3D',
  },
  destination: {
    chainID: 272,
    url: 'https://zksync2.nexus.avail.tools',
    token0: '0xB60cbba0Ca41aC92FF26378572caaf3E616dE71C',
    token1: '0x93c064Cb0dd5321C26511d828CeDE2506a828Bb9',
    mailboxContract: '0x96A52A4dAcf9Cf7c07C6af08Ecf892ec009ea5aa',
    mockNexusLockAndMint: '0x263E32f9cF5C1ef040C78d6b3B1512E9D04D0578',
    pool: '0x9765286a4B2302a36604e56e0d44562674Ef7B0e',
    crossChainIntentEscrow: '0x29461F701a36a6942c12f37756668d154262F6F2',
    uniswapV3PoolDeployer: '0x596aBA7bE76FDE6C51Ca428cAb7Fa4Ad25DAf8cC',
    uniswapV3Callee: '0x55247ddffdFe84d2184B610F52175B4B8077434e',
    appId: '0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d',
    uniswapCallback: '0x3b554FE53235F0A025545f2Bba1e2c9e0Ce98007',
    nexusProofManager: '0xa75bC26D9eCB95ad900d32265EF6b20D4a03A624',
    nexusUtils: '0x595edF17c92836e79A6430cb16E98058daCC4DFb',
  },
  nexusRPCUrl: 'http://dev.nexus.avail.tools',
  privateKey: '0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6',
  solverPrivateKey: '0xeffa2257255ca3a7b31a57b25c9300cc53f85ba4d22a62294581dc3de97e923d',
}

import { abi as token0Abi } from '../artifacts/contracts/test/TestERC20.sol/TestERC20.json'
import { abi as token1Abi } from '../artifacts/contracts/test/TestERC20.sol/TestERC20.json'
import { abi as poolAbi } from '../artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'
import { abi as calleeAbi } from '../artifacts/contracts/test/TestUniswapV3Callee.sol/TestUniswapV3Callee.json'
import { abi as uniswapCallbackAbi } from '../artifacts/contracts/test/UniswapV3PoolSwapTest.sol/UniswapV3PoolSwapTest.json'
import { abi as swapIntendsAbi } from '../artifacts/contracts/SwapIntends.sol/SwapIntends.json'
import { abi as nexusUtilsAbi } from '../artifacts/contracts/libraries/NexusUtils.sol/NexusUtils.json'
import mailboxAbi from './mailbox.json'
import { BigNumberish, Contract, ethers, MaxUint256, randomBytes } from 'ethers'
import {
  NexusClient,
  MailBoxClient,
  ProofManagerClient,
  ZKSyncVerifier,
  AccountApiResponse,
  Networks,
  MailboxMessageStruct,
} from 'nexus-js'
import bn, { BigNumber } from 'bignumber.js'

interface MailboxMessage {
  nexusAppIDFrom: string // bytes32 -> string
  nexusAppIDTo: string[] // bytes32[] -> string[]
  data: string // bytes -> string
  from: string // address -> string
  to: string[] // address[] -> string[]
  nonce: bigint | string // uint256 -> number or string for large numbers
}

const AMOUNT = '100000000000'
async function main() {
  const providerSource = new Provider(config.source.url)
  const providerDestination = new Provider(config.destination.url)

  const walletSource = new Wallet(config.privateKey, providerSource)
  const walletDestination = new Wallet(config.privateKey, providerDestination)

  const solverSource = new Wallet(config.solverPrivateKey, providerSource)
  const solverDestination = new Wallet(config.solverPrivateKey, providerDestination)

  const token0Source = new Contract(config.source.token0, token0Abi, walletSource)
  const token1Source = new Contract(config.source.token1, token1Abi, walletSource)

  const token0Destination = new Contract(config.destination.token0, token0Abi, walletDestination)
  const token1Destination = new Contract(config.destination.token1, token1Abi, walletDestination)

  const pool = new Contract(config.destination.pool, poolAbi, walletDestination)
  const swapCallee = new Contract(config.destination.uniswapV3Callee, calleeAbi, walletDestination)
  const swapIntends = new Contract(config.source.swapIntends, swapIntendsAbi, walletSource)
  const uniswapCallback = new Contract(config.destination.uniswapCallback, uniswapCallbackAbi, walletDestination)

  const sourceMailboxContract = new ethers.Contract(config.source.mailboxContract, mailboxAbi, providerSource)

  console.log('*****************************')
  console.log('* On Liquidity Chain')
  console.log('*****************************')
  console.log('💧 Putting liquidity to the pool')
  // put liquidity directly
  await token0Destination.mint(await pool.getAddress(), '999999999999996')
  await token1Destination.mint(await pool.getAddress(), '100000000000000')
  const price = encodePriceSqrt(BigInt(1), BigInt(2))
  const priceString = scientificToString(price.toString())
  console.log('💲 Price: ', priceString)
  await pool['initialize(uint160)'](priceString)
  console.log('🚀 Pool initialized')

  console.log('🪙 Minting tokens in the pool')
  await mint(token0Destination, token1Destination, swapCallee, pool, walletSource.address, -22980, 0, 1000000000)

  const { sqrtPriceX96, observationIndex } = await pool.slot0()

  console.log(`📊 sqrtPriceX96: ${sqrtPriceX96}`)
  console.log(`📊 observationIndex: ${observationIndex}`)
  console.log(`📊 tick: ${(await pool.slot0()).tick}`)

  const compact = {
    sponsor: await walletDestination.getAddress(),
    nonce: 0,
    token0: config.destination.token0,
    amount: AMOUNT,
    feeTier: 3000,
    stake: parseInt(AMOUNT) / 100,
    nexusSourceID: config.source.appId,
  }

  const mandate = {
    nexusTargetID: config.destination.appId,
    token1: config.destination.token1,
    minimumAmount: AMOUNT,
    expires: '10000000000000000',
    receiver: await walletDestination.getAddress(),
    salt: randomBytes(32),
  }

  console.log('\n')
  console.log('*****************************')
  console.log('* On Source Chain')
  console.log('*****************************')
  console.log('\n')

  console.log('💵 Funding solver')
  // @ts-ignore
  await token0Source.connect(solverSource).mint(await solverSource.getAddress(), AMOUNT)
  // @ts-ignore
  await token0Source.connect(solverSource).approve(await swapIntends.getAddress(), AMOUNT)

  console.log('💵 Funding user on Source Chain ')
  // @ts-ignore
  await token0Source.connect(walletSource).mint(await walletSource.getAddress(), AMOUNT)
  // @ts-ignore
  await token0Source.connect(walletSource).approve(await swapIntends.getAddress(), AMOUNT)

  console.log('\n')
  console.log('*****************************')
  console.log('* Balance Info')
  console.log('*****************************')
  console.log('\n')

  // Get user balances
  let userSourceToken0Balance = await token0Source.balanceOf(walletSource.address)
  let userSourceToken1Balance = await token1Source.balanceOf(walletSource.address)

  console.log('User balances:')
  console.log(`Source Chain - Token0: ${userSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${userSourceToken1Balance}`)

  // Get solver balances
  let solverSourceToken0Balance = await token0Source.balanceOf(solverSource.address)
  let solverSourceToken1Balance = await token1Source.balanceOf(solverSource.address)
  let solverDestToken0Balance = await token0Destination.balanceOf(solverDestination.address)
  let solverDestToken1Balance = await token1Destination.balanceOf(solverDestination.address)

  console.log('\nSolver balances:')
  console.log(`Source Chain - Token0: ${solverSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${solverSourceToken1Balance}`)
  console.log(`Destination Chain - Token0: ${solverDestToken0Balance}`)
  console.log(`Destination Chain - Token1: ${solverDestToken1Balance}`)

  console.log('\n')
  console.log('*****************************')
  console.log('* On Source Chain')
  console.log('*****************************')
  console.log('\n')

  console.log('🔄 Creating swap intent')
  // @ts-ignore
  const swapIntent = swapIntends.connect(walletSource).petition(compact, mandate, AMOUNT)
  const tx = await swapIntent
  const receipt = await tx.wait()
  console.log('✅ Swap intent created')

  let orderHash
  for (const log of receipt.logs) {
    try {
      let compact =
        '(address sponser,uint256 nonce,address token0,uint256 amount,uint256 feeTier,uint256 stake,bytes32 nexusSourceID)'
      let mandate =
        '(bytes32 nexusTargetID,address token1,uint256 minimumAmount,uint256 expires,address receiver,bytes32 salt)'
      const abi = [`event PetitionCreated(bytes32 orderHash,${compact} compact,${mandate} mandate)`]
      const eventInterface = new ethers.Interface(abi)
      const decodedLog = eventInterface.decodeEventLog('PetitionCreated', log.data, log.topics)

      orderHash = decodedLog[0]
      break
    } catch (err) {
      continue
    }
  }

  const swapOrder = {
    arbiter: await solverDestination.getAddress(),
    compact: compact,
    mandate: mandate,
    amountLocked: AMOUNT,
    orderID: orderHash,
    processor: await swapIntends.getAddress(),
  }

  console.log('swapOrder', swapOrder)
  console.log('🤝 Accepting swap order')

  await swapIntends.setDestinationToSourceMapping(
    config.destination.appId,
    config.source.token0,
    config.destination.token0
  )
  await swapIntends.setDestinationToSourceMapping(
    config.destination.appId,
    config.source.token1,
    config.destination.token1
  )

  console.log('\n')
  console.log('*****************************')
  console.log('* On Liquidity Chain')
  console.log('*****************************')
  console.log('\n')
  console.log('💵 Funding solver on Liquidity Chain')
  // @ts-ignore
  await token0Destination.connect(solverDestination).mint(await solverDestination.getAddress(), AMOUNT)
  // @ts-ignore
  await token0Destination.connect(solverDestination).approve(await uniswapCallback.getAddress(), AMOUNT)

  // @ts-ignore
  const swapOrderAccept = swapIntends.connect(solverSource).acceptSwapOrder(orderHash)
  const swapOrderAcceptTx = await swapOrderAccept
  await swapOrderAcceptTx.wait()

  console.log('🔄 Solver Swapping to lock price')
  const swap = await uniswapCallback
    .connect(solverDestination)
    // @ts-ignore
    .swapIntent(await pool.getAddress(), true, AMOUNT, swapOrder)
  const receiptSwap = await swap.wait()

  let receiptHash: string = '0x'
  for (const log of receiptSwap.logs) {
    try {
      const abi = [
        'event MailboxEvent(bytes32 indexed nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address indexed from, address[] to, uint256 nonce, bytes32 receiptHash)',
      ]
      const eventInterface = new ethers.Interface(abi)
      const decodedLog = eventInterface.decodeEventLog('MailboxEvent', log.data, log.topics)

      receiptHash = decodedLog.receiptHash
      break
    } catch (err) {
      continue
    }
  }

  console.log('📝 Receipt hash: ', receiptHash)

  console.log(
    '✅ Solver swapped and locked price successfully, now waiting on update on Nexus to receive funds on source chain'
  )

  console.log('\n')
  console.log('*****************************')
  console.log('* Balance Info')
  console.log('*****************************')
  console.log('\n')

  // Get user balances
  userSourceToken0Balance = await token0Source.balanceOf(walletSource.address)
  userSourceToken1Balance = await token1Source.balanceOf(walletSource.address)

  console.log('User balances:')
  console.log(`Source Chain - Token0: ${userSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${userSourceToken1Balance}`)

  // Get solver balances
  solverSourceToken0Balance = await token0Source.balanceOf(solverSource.address)
  solverSourceToken1Balance = await token1Source.balanceOf(solverSource.address)
  solverDestToken0Balance = await token0Destination.balanceOf(solverDestination.address)
  solverDestToken1Balance = await token1Destination.balanceOf(solverDestination.address)

  console.log('\nSolver balances:')
  console.log(`Source Chain - Token0: ${solverSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${solverSourceToken1Balance}`)
  console.log(`Destination Chain - Token0: ${solverDestToken0Balance}`)
  console.log(`Destination Chain - Token1: ${solverDestToken1Balance}`)

  console.log('\n')
  console.log('*****************************')
  console.log('* On Liquidity Chain')
  console.log('*****************************')
  console.log('\n')

  const nexusClient = new NexusClient(config.nexusRPCUrl, config.destination.appId)
  const mailboxContract = new ethers.Contract(config.destination.mailboxContract, mailboxAbi, providerDestination)
  const mapping = await mailboxContract.getSendMessage(receiptHash)
  console.log(mapping)
  const exists = await mailboxContract.messages(receiptHash)
  console.log('📨 Message exists: ', exists)
  // // relayer
  const proofManagerClient = new ProofManagerClient(
    config.source.nexusProofManager,
    config.source.url,
    config.privateKey
  )

  console.log('\n')
  console.log('*******************************************')
  console.log('⏳ Waiting for ZKSYNC to generate proof...')
  console.log('*******************************************')
  console.log('\n')

  const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(nexusClient, 0)
  console.log('📊 Account details: ', accountDetails)
  await proofManagerClient.updateNexusBlock(
    accountDetails.response.nexus_header.number,
    `0x${accountDetails.response.nexus_header.state_root}`,
    //TODO: To be replaced by hash of nexus header.
    `0x${accountDetails.response.nexus_header.avail_header_hash}`,
    //TODO: To be replaced with actual proof depending on prover mode.
    ''
  )

  console.log('\n')
  console.log('*****************************')
  console.log('* On Source Chain')
  console.log('*****************************')
  console.log('\n')

  console.log('✅ Updated Nexus Block')
  await sleep(2000)
  await proofManagerClient.updateChainState(
    accountDetails.response.nexus_header.number,
    accountDetails.response.proof,
    config.destination.appId,
    accountDetails.response.account
  )

  console.log('✅ Updated Chain State')

  const zksyncAdapter = new ZKSyncVerifier(
    {
      [config.source.appId]: {
        rpcUrl: config.source.url,
        mailboxContract: config.source.mailboxContract,
        stateManagerContract: config.source.nexusProofManager,
        appID: config.source.appId,
        chainId: config.source.chainID.toString(),
        type: Networks.ZKSync,
        privateKey: config.privateKey,
      },
      [config.destination.appId]: {
        rpcUrl: config.destination.url,
        mailboxContract: config.destination.mailboxContract,
        stateManagerContract: config.destination.nexusProofManager,
        appID: config.destination.appId,
        chainId: config.destination.chainID.toString(),
        type: Networks.ZKSync,
        privateKey: config.privateKey,
      },
    },
    config.source.appId
  )

  function calculateSlot(messageHash: string, mappingSlot: number): string {
    // IMPORTANT: This matches Solidity's abi.encode exactly
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32', 'uint256'], [messageHash, mappingSlot])

    return ethers.keccak256(encoded)
  }
  const SEND_MESSAGES_SLOT = 0

  const slot = calculateSlot(receiptHash, SEND_MESSAGES_SLOT)
  console.log('🔑 Storage slot:', slot)
  const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height, mapping, {
    storageKey: slot.toString(),
  })

  console.log('🔍 Proof', proof)

  const encodedProof = zksyncAdapter.encodeMessageProof(proof)

  const messageDecoded: MailboxMessage = {
    nexusAppIDFrom: mapping.nexusAppIDFrom,
    nexusAppIDTo: [...mapping.nexusAppIDTo],
    data: mapping.data,
    from: mapping.from,
    to: [...mapping.to],
    nonce: mapping.nonce,
  }

  console.log('messageDecoded', messageDecoded)

  await sourceMailboxContract
    .connect(solverSource)
    // @ts-ignore
    .receiveMessage(accountDetails.response.account.height, messageDecoded, encodedProof)

  await sleep(5000)
  console.log('\n')
  console.log('*****************************')
  console.log('* Balance Info')
  console.log('*****************************')
  console.log('\n')

  // Get user balances
  userSourceToken0Balance = await token0Source.balanceOf(walletSource.address)
  userSourceToken1Balance = await token1Source.balanceOf(walletSource.address)

  console.log('✅ Message received')

  console.log('User balances:')
  console.log(`Source Chain - Token0: ${userSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${userSourceToken1Balance}`)

  // Get solver balances
  solverSourceToken0Balance = await token0Source.balanceOf(solverSource.address)
  solverSourceToken1Balance = await token1Source.balanceOf(solverSource.address)
  solverDestToken0Balance = await token0Destination.balanceOf(solverDestination.address)
  solverDestToken1Balance = await token1Destination.balanceOf(solverDestination.address)

  console.log('\nSolver balances:')
  console.log(`Source Chain - Token0: ${solverSourceToken0Balance}`)
  console.log(`Source Chain - Token1: ${solverSourceToken1Balance}`)
  console.log(`Destination Chain - Token0: ${solverDestToken0Balance}`)
  console.log(`Destination Chain - Token1: ${solverDestToken1Balance}`)
}

export function encodePriceSqrt(reserve1: BigNumberish, reserve0: BigNumberish): bn {
  return new bn(reserve1.toString()).div(reserve0.toString()).sqrt().multipliedBy(new bn(2).pow(96)).integerValue(3)
}
const mint = async (
  token0: Contract,
  token1: Contract,
  swapTarget: Contract,
  pool: Contract,
  recipient: string,
  tickLower: number,
  tickUpper: number,
  liquidity: BigNumberish
) => {
  await token0.approve(await swapTarget.getAddress(), MaxUint256)
  await token1.approve(await swapTarget.getAddress(), MaxUint256)

  return swapTarget.mint(await pool.getAddress(), recipient, tickLower, tickUpper, liquidity)
}

function scientificToString(sci: string): string {
  // Parse into coefficient and exponent
  const [coefficient, exponent] = sci.split('e')
  const exp = parseInt(exponent.replace('+', ''))

  // Remove decimal point from coefficient
  const coeffWithoutDecimal = coefficient.replace('.', '')

  // Calculate how many zeros to add
  const zerosToAdd = exp - (coeffWithoutDecimal.length - coefficient.indexOf('.') - 1)

  // Create full number
  return coeffWithoutDecimal + '0'.repeat(zerosToAdd)
}

function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000
  return new Promise((resolve) => setTimeout(resolve, duration))
}

async function waitForUpdateOnNexus(nexusClient: NexusClient, blockHeight: number): Promise<AccountApiResponse> {
  //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
  await sleep(90000)
  const response: AccountApiResponse = await nexusClient.getAccountState()

  if (response.response.account.height == 0) {
    throw new Error('Account not yet initiated')
  }
  return response
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
