import { ethers, waffle } from 'hardhat'
import { BigNumber, BigNumberish, constants, Contract, Wallet } from 'ethers'
import { TestERC20 } from '../typechain/TestERC20'
import { UniswapV3Factory } from '../typechain/UniswapV3Factory'
import { MockTimeUniswapV3Pool } from '../typechain/MockTimeUniswapV3Pool'
import { TestUniswapV3SwapPay } from '../typechain/TestUniswapV3SwapPay'
import { MockNexusLockAndMint, NexusLockAndMint } from '../typechain/MockNexusLockAndMint'
import checkObservationEquals from './shared/checkObservationEquals'
import { expect } from './shared/expect'

import { poolFixture, TEST_POOL_START_TIME } from './shared/fixtures'

import {
  expandTo18Decimals,
  FeeAmount,
  getPositionKey,
  getMaxTick,
  getMinTick,
  encodePriceSqrt,
  TICK_SPACINGS,
  createPoolFunctions,
  SwapFunction,
  MintFunction,
  getMaxLiquidityPerTick,
  FlashFunction,
  MaxUint128,
  MAX_SQRT_RATIO,
  MIN_SQRT_RATIO,
  SwapToPriceFunction,
} from './shared/utilities'
import { TestUniswapV3Callee } from '../typechain/TestUniswapV3Callee'
import { TestUniswapV3ReentrantCallee } from '../typechain/TestUniswapV3ReentrantCallee'
import { CrossChainIntentEscrow } from '../typechain/CrossChainIntentEscrow'
import { SwapIntends } from '../typechain/SwapIntends'
import { TickMathTest } from '../typechain/TickMathTest'
import { SwapMathTest } from '../typechain/SwapMathTest'
import { UniswapV3PoolSwapTest } from '../typechain/UniswapV3PoolSwapTest'

const createFixtureLoader = waffle.createFixtureLoader

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T

describe('UniswapV3Pool', () => {
  let wallet: Wallet, other: Wallet
  let user: Wallet
  let solver: Wallet

  let token0: TestERC20
  let token1: TestERC20
  let token2: TestERC20

  let factory: UniswapV3Factory
  let pool: MockTimeUniswapV3Pool
  let swapIntends: SwapIntends
  let nexusMailboxSource: Contract
  let uniswapCallback: UniswapV3PoolSwapTest
  let escrow: CrossChainIntentEscrow
  let swapTarget: TestUniswapV3Callee
  let mintContract: MockNexusLockAndMint
  let swapToLowerPrice: SwapToPriceFunction
  let swapToHigherPrice: SwapToPriceFunction
  let swapExact0For1: SwapFunction
  let swap0ForExact1: SwapFunction
  let swapExact1For0: SwapFunction
  let swap1ForExact0: SwapFunction

  let feeAmount: number
  let tickSpacing: number

  let minTick: number
  let maxTick: number

  let mint: MintFunction
  let flash: FlashFunction

  let loadFixture: ReturnType<typeof createFixtureLoader>
  let createPool: ThenArg<ReturnType<typeof poolFixture>>['createPool']

  before('create fixture loader', async () => {
    ;[wallet, other, user, solver] = await (ethers as any).getSigners()
    loadFixture = createFixtureLoader([wallet, other])
  })

  beforeEach('deploy fixture', async () => {
    ;({ token0, token1, token2, factory, createPool, swapTargetCallee: swapTarget } = await loadFixture(poolFixture))

    const oldCreatePool = createPool
    createPool = async (_feeAmount, _tickSpacing) => {
      const pool = await oldCreatePool(_feeAmount, _tickSpacing)
      ;({
        swapToLowerPrice,
        swapToHigherPrice,
        swapExact0For1,
        swap0ForExact1,
        swapExact1For0,
        swap1ForExact0,
        mint,
        flash,
      } = createPoolFunctions({
        token0,
        token1,
        swapTarget,
        pool,
      }))
      minTick = getMinTick(_tickSpacing)
      maxTick = getMaxTick(_tickSpacing)
      feeAmount = _feeAmount
      tickSpacing = _tickSpacing
      return pool
    }
    // default to the 30 bips pool
    pool = await createPool(FeeAmount.MEDIUM, TICK_SPACINGS[FeeAmount.MEDIUM])

    const NexusMailboxSource = await ethers.getContractFactory('MockNexusMailbox')
    nexusMailboxSource = await NexusMailboxSource.deploy()

    const MintContract = await ethers.getContractFactory('MockNexusLockAndMint')
    mintContract = (await MintContract.deploy()) as NexusLockAndMint

    const SwapIntends = await ethers.getContractFactory('SwapIntends')
    swapIntends = (await SwapIntends.deploy(nexusMailboxSource.address, mintContract.address)) as SwapIntends

    const UniswapV3PoolSwapTest = await ethers.getContractFactory('UniswapV3PoolSwapTest')
    uniswapCallback = (await UniswapV3PoolSwapTest.deploy()) as UniswapV3PoolSwapTest

    const escrowFactory = await ethers.getContractFactory('CrossChainIntentEscrow')
    escrow = (await escrowFactory.deploy()) as CrossChainIntentEscrow

    await pool.setMailboxAndEscrow(nexusMailboxSource.address, escrow.address)
  })

  describe('#initialize', () => {
    it('fails if already initialized', async () => {
      await pool.initialize(encodePriceSqrt(1, 1))
      await expect(pool.initialize(encodePriceSqrt(1, 1))).to.be.reverted
    })
    it('fails if starting price is too low', async () => {
      await expect(pool.initialize(1)).to.be.revertedWith('R')
      await expect(pool.initialize(MIN_SQRT_RATIO.sub(1))).to.be.revertedWith('R')
    })
    it('fails if starting price is too high', async () => {
      await expect(pool.initialize(MAX_SQRT_RATIO)).to.be.revertedWith('R')
      await expect(pool.initialize(BigNumber.from(2).pow(160).sub(1))).to.be.revertedWith('R')
    })
    it('can be initialized at MIN_SQRT_RATIO', async () => {
      await pool.initialize(MIN_SQRT_RATIO)
      expect((await pool.slot0()).tick).to.eq(getMinTick(1))
    })
    it('can be initialized at MAX_SQRT_RATIO - 1', async () => {
      await pool.initialize(MAX_SQRT_RATIO.sub(1))
      expect((await pool.slot0()).tick).to.eq(getMaxTick(1) - 1)
    })
    it('sets initial variables', async () => {
      const price = encodePriceSqrt(1, 2)
      await pool.initialize(price)

      const { sqrtPriceX96, observationIndex } = await pool.slot0()
      expect(sqrtPriceX96).to.eq(price)
      expect(observationIndex).to.eq(0)
      expect((await pool.slot0()).tick).to.eq(-6932)
    })
    it('initializes the first observations slot', async () => {
      await pool.initialize(encodePriceSqrt(1, 1))
      checkObservationEquals(await pool.observations(0), {
        secondsPerLiquidityCumulativeX128: 0,
        initialized: true,
        blockTimestamp: TEST_POOL_START_TIME,
        tickCumulative: 0,
      })
    })
    it('emits a Initialized event with the input tick', async () => {
      const sqrtPriceX96 = encodePriceSqrt(1, 2)
      await expect(pool.initialize(sqrtPriceX96)).to.emit(pool, 'Initialize').withArgs(sqrtPriceX96, -6932)
    })
  })

  describe('Origin Chain - Phase 1', () => {
    it('should be able to create swap intent', async () => {
      const compact = {
        sponsor: user.address,
        nonce: 0,
        token0: token0.address,
        amount: '1000000000000000000',
        feeTier: 3000,
        stake: '1000000000000000000',
        nexusSourceID: ethers.utils.formatBytes32String('0x0123'),
      }

      const mandate = {
        nexusTargetID: ethers.utils.formatBytes32String('0x0123'),
        token1: token1.address,
        minimumAmount: '1000000000000000000',
        expires: '1000000000000000000',
        receiver: user.address,
        salt: ethers.utils.formatBytes32String('0x0123'),
      }

      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(swapIntends.address, '1000000000000000000')
      const swapIntent = swapIntends.connect(user).petition(compact, mandate, '100000000000000000')
      const tx = await swapIntent
      const receipt = await tx.wait()
      const event = receipt.events?.find((e) => e.event === 'PetitionCreated')

      expect(event?.args?.orderHash).to.not.be.undefined
      expect(event?.args?.compact).to.not.be.undefined
      expect(event?.args?.mandate).to.not.be.undefined
    })
    it('solver should be able to lock swap intent', async () => {
      const compact = {
        sponsor: user.address,
        nonce: 0,
        token0: token0.address,
        amount: '1000000000000000000',
        feeTier: 3000,
        stake: '100000000000000000',
        nexusSourceID: ethers.utils.formatBytes32String('0x0123'),
      }

      const mandate = {
        nexusTargetID: ethers.utils.formatBytes32String('0x0123'),
        token1: token1.address,
        minimumAmount: '1000000000000000000',
        expires: '1000000000000000000',
        receiver: user.address,
        salt: ethers.utils.formatBytes32String('0x0123'),
      }

      await token0.connect(solver).mint(solver.address, '100000000000000000')
      await token0.connect(solver).approve(swapIntends.address, '100000000000000000')

      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(swapIntends.address, '1000000000000000000')

      const swapIntent = swapIntends.connect(user).petition(compact, mandate, '1000000000000000000')
      const tx = await swapIntent
      const receipt = await tx.wait()
      const orderHash = receipt.events?.find((e) => e.event === 'PetitionCreated')?.args?.orderHash

      const acceptSwapOrder = swapIntends.connect(solver).acceptSwapOrder(orderHash)
      const acceptSwapOrderTx = await acceptSwapOrder
      const acceptSwapOrderReceipt = await acceptSwapOrderTx.wait()
      const event = acceptSwapOrderReceipt.events?.find((e) => e.event === 'SwapOrderAccepted')

      expect(event?.args?.orderHash).to.eq(orderHash)
      expect(event?.args?.order.arbiter).to.eq(solver.address)
      expect(event?.args?.order.compact.sponsor).to.eq(compact.sponsor)
      expect(event?.args?.order.compact.nonce).to.eq(compact.nonce)
      expect(event?.args?.order.compact.token0).to.eq(compact.token0)
      expect(event?.args?.order.compact.amount).to.eq(compact.amount)
      expect(event?.args?.order.compact.feeTier).to.eq(compact.feeTier)
      expect(event?.args?.order.compact.stake).to.eq(compact.stake)
      expect(event?.args?.order.compact.nexusSourceID).to.eq(compact.nexusSourceID)
      expect(event?.args?.order.mandate.nexusTargetID).to.eq(mandate.nexusTargetID)
      expect(event?.args?.order.mandate.token1).to.eq(mandate.token1)
      expect(event?.args?.order.mandate.minimumAmount).to.eq(mandate.minimumAmount)
      expect(event?.args?.order.mandate.expires).to.eq(mandate.expires)
      expect(event?.args?.order.mandate.receiver).to.eq(mandate.receiver)
      expect(event?.args?.order.mandate.salt).to.eq(mandate.salt)
      expect(event?.args?.order.amountLocked).to.eq(compact.stake)
      expect(event?.args?.order.orderID).to.eq(orderHash)
    })
  })

  describe('Destination Chain', () => {
    it('should be able to swap the token', async () => {
      // put liquidity directly
      await token0.mint(pool.address, '9996')
      await token1.mint(pool.address, '1000')

      const price = encodePriceSqrt(1, 2)
      await pool.initialize(price)
      await expect(mint(wallet.address, -22980, 0, 10000))
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pool.address, 4143)

      expect(await token0.balanceOf(pool.address)).to.eq(9996 + 4143)
      expect(await token1.balanceOf(pool.address)).to.eq(4902)

      const { sqrtPriceX96, observationIndex } = await pool.slot0()

      expect(sqrtPriceX96).to.eq(price)
      expect(observationIndex).to.eq(0)
      expect((await pool.slot0()).tick).to.eq(-6932)

      // fund user wallet
      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(uniswapCallback.address, '10000000000000000000000000')

      let sqrtPriceLimit = MIN_SQRT_RATIO.add(1)

      const token0BalanceBeforePool = await token0.balanceOf(pool.address)
      const token1BalanceBefore = await token1.balanceOf(wallet.address)
      const token0BalanceBeforeUser = await token0.balanceOf(user.address)
      const swap = await uniswapCallback
        .connect(user)
        .swap(pool.address, wallet.address, true, '1000000000000000000', sqrtPriceLimit)
      await swap.wait()

      expect(await token1.balanceOf(wallet.address)).to.eq(token1BalanceBefore.add('3900'))
      expect(await token0.balanceOf(user.address)).to.eq(token0BalanceBeforeUser.sub('17461'))
      expect(await token0.balanceOf(pool.address)).to.eq(token0BalanceBeforePool.add('17461'))
    })

    it('receipt should be available in nexus mailbox when swap takes place for intent fill', async () => {
      // put liquidity directly
      await token0.mint(pool.address, '9996')
      await token1.mint(pool.address, '1000')

      const price = encodePriceSqrt(1, 2)
      await pool.initialize(price)
      await expect(mint(wallet.address, -22980, 0, 10000))
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pool.address, 4143)

      expect(await token0.balanceOf(pool.address)).to.eq(9996 + 4143)
      expect(await token1.balanceOf(pool.address)).to.eq(4902)

      const { sqrtPriceX96, observationIndex } = await pool.slot0()

      expect(sqrtPriceX96).to.eq(price)
      expect(observationIndex).to.eq(0)
      expect((await pool.slot0()).tick).to.eq(-6932)

      // fund user wallet
      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(uniswapCallback.address, '10000000000000000000000000')

      const compact = {
        sponsor: user.address,
        nonce: 0,
        token0: token0.address,
        amount: '1000000000000000000',
        feeTier: 3000,
        stake: '100000000000000000',
        nexusSourceID: ethers.utils.formatBytes32String('0x0123'),
      }

      const mandate = {
        nexusTargetID: ethers.utils.formatBytes32String('0x0123'),
        token1: token1.address,
        minimumAmount: '1000000000000000000',
        expires: '1000000000000000000',
        receiver: user.address,
        salt: ethers.utils.formatBytes32String('0x0123'),
      }

      await token0.connect(solver).mint(solver.address, '1000000000000000000')
      await token0.connect(solver).approve(swapIntends.address, '1000000000000000000')
      await token0.connect(solver).approve(uniswapCallback.address, '1000000000000000000')

      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(swapIntends.address, '1000000000000000000')

      const swapIntent = swapIntends.connect(user).petition(compact, mandate, '1000000000000000000')
      const tx = await swapIntent
      const receipt = await tx.wait()
      const orderHash = receipt.events?.find((e) => e.event === 'PetitionCreated')?.args?.orderHash

      const swapOrder = {
        arbiter: solver.address,
        compact: compact,
        mandate: mandate,
        amountLocked: '1000000000000000000',
        orderID: orderHash,
        processor: swapIntends.address,
      }
      const solverBalanceBefore = await token0.balanceOf(solver.address)
      const escrowBalanceBeforeToken0 = await token0.balanceOf(escrow.address)
      const escrowBalanceBeforeToken1 = await token1.balanceOf(escrow.address)
      const poolBalanceBeforeToken0 = await token0.balanceOf(pool.address)
      const poolBalanceBeforeToken1 = await token1.balanceOf(pool.address)
      const swap = await uniswapCallback
        .connect(solver)
        .swapIntent(pool.address, true, '1000000000000000000', swapOrder)
      const swapReceipt = await swap.wait()

      const solverBalanceAfter = await token0.balanceOf(solver.address)
      const escrowBalanceAfterToken0 = await token0.balanceOf(escrow.address)
      const escrowBalanceAfterToken1 = await token1.balanceOf(escrow.address)
      const poolBalanceAfterToken0 = await token0.balanceOf(pool.address)
      const poolBalanceAfterToken1 = await token1.balanceOf(pool.address)

      expect(solverBalanceAfter).to.eq(solverBalanceBefore.sub('17461'))
      expect(poolBalanceAfterToken0).to.eq(poolBalanceBeforeToken0.add('17461'))
      expect(poolBalanceAfterToken1).to.eq(poolBalanceBeforeToken1.sub('3900'))
      expect(escrowBalanceAfterToken0.sub(escrowBalanceBeforeToken0)).to.eq(0)
      expect(escrowBalanceAfterToken1.sub(escrowBalanceBeforeToken1)).to.eq(3900)

      const nexusID = await nexusMailboxSource.getSentMessage(0)

      expect(nexusID.nexusAppIDFrom).to.eq(ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32))
      expect(nexusID.to).to.deep.eq([swapIntends.address])
    })
  })

  describe('Origin Chain - Phase 2', () => {
    it('should be able to unlock swap intent after confirmation from destination chain and solver receives the locked assets', async () => {
      // put liquidity directly
      await token0.mint(pool.address, '9996')
      await token1.mint(pool.address, '1000')

      const price = encodePriceSqrt(1, 2)
      await pool.initialize(price)
      await expect(mint(wallet.address, -22980, 0, 10000))
        .to.emit(token0, 'Transfer')
        .withArgs(wallet.address, pool.address, 4143)

      expect(await token0.balanceOf(pool.address)).to.eq(9996 + 4143)
      expect(await token1.balanceOf(pool.address)).to.eq(4902)

      const { sqrtPriceX96, observationIndex } = await pool.slot0()

      expect(sqrtPriceX96).to.eq(price)
      expect(observationIndex).to.eq(0)
      expect((await pool.slot0()).tick).to.eq(-6932)

      // fund user wallet
      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(uniswapCallback.address, '10000000000000000000000000')

      const compact = {
        sponsor: user.address,
        nonce: 0,
        token0: token0.address,
        amount: '1000000000000000000',
        feeTier: 3000,
        stake: '100000000000000000',
        nexusSourceID: ethers.utils.formatBytes32String('0x0123'),
      }

      const mandate = {
        nexusTargetID: ethers.utils.formatBytes32String('0x0123'),
        token1: token1.address,
        minimumAmount: '1000000000000000000',
        expires: '1000000000000000000',
        receiver: user.address,
        salt: ethers.utils.formatBytes32String('0x0123'),
      }

      await token0.connect(solver).mint(solver.address, '1000000000000000000')
      await token0.connect(solver).approve(swapIntends.address, '1000000000000000000')
      await token0.connect(solver).approve(uniswapCallback.address, '1000000000000000000')

      await token0.connect(user).mint(user.address, '1000000000000000000')
      await token0.connect(user).approve(swapIntends.address, '1000000000000000000')

      const swapIntent = swapIntends.connect(user).petition(compact, mandate, '1000000000000000000')
      const tx = await swapIntent
      const receipt = await tx.wait()
      const orderHash = receipt.events?.find((e) => e.event === 'PetitionCreated')?.args?.orderHash

      const swapOrder = {
        arbiter: solver.address,
        compact: compact,
        mandate: mandate,
        amountLocked: '1000000000000000000',
        orderID: orderHash,
        processor: swapIntends.address,
      }

      const swapOrderAccept = swapIntends.connect(solver).acceptSwapOrder(orderHash)
      const swapOrderAcceptTx = await swapOrderAccept
      await swapOrderAcceptTx.wait()

      const swap = await uniswapCallback
        .connect(solver)
        .swapIntent(pool.address, true, '1000000000000000000', swapOrder)
      await swap.wait()

      const solverBalanceBeforeToken0 = await token0.balanceOf(solver.address)
      const solverBalanceBeforeToken1 = await token1.balanceOf(solver.address)
      const userBalanceBeforeToken0 = await token0.balanceOf(user.address)
      const userBalanceBeforeToken1 = await mintContract.balanceOf(user.address)

      const nexusMessage = await nexusMailboxSource.getSentMessage(0)
      await nexusMailboxSource.receiveMessage(0, nexusMessage, '0x')

      const solverBalanceAfterToken0 = await token0.balanceOf(solver.address)
      const solverBalanceAfterToken1 = await token1.balanceOf(solver.address)
      const userBalanceAfterToken0 = await token0.balanceOf(user.address)
      const userBalanceAfterToken1 = await mintContract.balanceOf(user.address)

      expect(solverBalanceAfterToken0.sub(solverBalanceBeforeToken0)).to.eq(17461)
      expect(solverBalanceAfterToken1.sub(solverBalanceBeforeToken1)).to.eq(0)
      expect(userBalanceAfterToken0.sub(userBalanceBeforeToken0)).to.eq(-17461)
      expect(userBalanceAfterToken1.sub(userBalanceBeforeToken1)).to.eq(3900)
    })
  })
})
