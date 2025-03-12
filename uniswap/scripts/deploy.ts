import { zksyncEthers, ethers, network } from 'hardhat'

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}
const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
}

const deployConfig = {
  source: {
    chainID: 271,
    nexusMailbox: '0x9a03a545A60263216c4310Be05C34B71C170903A',
    nexusStateManager: '0xaaA07C6575E855AA279Ba04B63E8C5ee7FBc5908',
    appId: '0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e',
    url: 'https://zksync1.nexus.avail.tools',
    feeAmount: FeeAmount.MEDIUM,
    tickSpacing: TICK_SPACINGS[FeeAmount.MEDIUM],
  },
  destination: {
    destinationChainToken0: '0xB60cbba0Ca41aC92FF26378572caaf3E616dE71C',
    destinationChainToken1: '0x93c064Cb0dd5321C26511d828CeDE2506a828Bb9',
    chainID: 272,
    nexusMailbox: '0x96A52A4dAcf9Cf7c07C6af08Ecf892ec009ea5aa',
    nexusStateManager: '0x19CC70262bc3337Ebd21750125d725546e1E0982',
    appId: '0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d',
    url: 'https://zksync2.nexus.avail.tools',
  },
  nexusRPCUrl: 'http://dev.nexus.avail.tools',
  privateKey: '0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6',
}

async function deploy() {
  console.log('Starting deployment of NexusCrossChainSwapIntent System...')

  // Get signers
  const [deployer] = await zksyncEthers.getSigners()
  console.log(`Deployer address: ${deployer.address}`)

  console.log(`Deployer balance: ${ethers.parseEther((await deployer.getBalance()).toString())} ETH`)

  const nexusUtils = await zksyncEthers.getContractFactory('NexusUtils')
  const nexusUtilsContract = await nexusUtils.deploy()
  console.log(`NexusUtils deployed to: ${await nexusUtilsContract.getAddress()}`)

  if (network.config.chainId === deployConfig.source.chainID) {
    // For testing purposes, you might want to create and configure test tokens
    // and set up a Uniswap V3 pool
    console.log('Deploying test tokens...')
    const TestERC20Factory = await zksyncEthers.getContractFactory('TestERC20')
    const token0 = await TestERC20Factory.deploy('100000000000')

    console.log(`TestERC20 (token0) deployed to: ${await token0.getAddress()}`)

    const token1 = await TestERC20Factory.deploy('100000000000')

    console.log(`TestERC20 (token1) deployed to: ${await token1.getAddress()}`)

    // Log all the deployed addresses for easy reference
    console.log('\nDeployment Summary:')
    console.log('-------------------')

    console.log(`TestERC20 (token0): ${await token0.getAddress()}`)
    console.log(`TestERC20 (token1): ${await token1.getAddress()}`)

    // Deploy MockNexusLockAndMint
    console.log('Deploying MockNexusLockAndMint...')
    const MintContractFactory = await zksyncEthers.getContractFactory('MockNexusLockAndMint')
    const mintContract = await MintContractFactory.deploy()

    console.log(`MockNexusLockAndMint deployed to: ${await mintContract.getAddress()}`)

    // Deploy SwapIntends
    console.log('Deploying SwapIntends...')
    const SwapIntendsFactory = await zksyncEthers.getContractFactory('SwapIntends')
    const swapIntends = await SwapIntendsFactory.deploy(
      deployConfig.source.nexusMailbox,
      await mintContract.getAddress()
    )

    await swapIntends.setDestinationToSourceMapping(
      deployConfig.destination.appId,
      deployConfig.destination.destinationChainToken0,
      await token0.getAddress()
    )

    await swapIntends.setDestinationToSourceMapping(
      deployConfig.destination.appId,
      deployConfig.destination.destinationChainToken1,
      await token1.getAddress()
    )

    console.log(`SwapIntends deployed to: ${await swapIntends.getAddress()}`)
    console.log(`MockNexusLockAndMint: ${await mintContract.getAddress()}`)
    console.log(`SwapIntends: ${await swapIntends.getAddress()}`)
  }

  if (network.config.chainId === deployConfig.destination.chainID) {
    // For testing purposes, you might want to create and configure test tokens
    // and set up a Uniswap V3 pool
    console.log('Deploying test tokens...')
    const TestERC20Factory = await zksyncEthers.getContractFactory('TestERC20')
    const token0 = TestERC20Factory.attach('0xB60cbba0Ca41aC92FF26378572caaf3E616dE71C')

    console.log(`TestERC20 (token0) deployed to: ${await token0.getAddress()}`)

    const token1 = await TestERC20Factory.attach('0x93c064Cb0dd5321C26511d828CeDE2506a828Bb9')
    console.log(`TestERC20 (token1) deployed to: ${await token1.getAddress()}`)
    const createPool = async (fee: any, tickSpacing: any, firstToken = token0, secondToken = token1) => {
      try {
        const PoolFactory = await zksyncEthers.getContractFactory('MockTimeUniswapV3Pool')
        const pool = await PoolFactory.deploy()
        console.log(`UniswapV3Pool deployed to: ${await pool.getAddress()}`)
        const factoryFactory = await zksyncEthers.getContractFactory('UniswapV3Factory')
        const factory = await factoryFactory.deploy()
        console.log(`UniswapV3Factory deployed to: ${await factory.getAddress()}`)

        const MockTimeUniswapV3PoolDeployerFactory = await zksyncEthers.getContractFactory(
          'MockTimeUniswapV3PoolDeployer'
        )

        const mockTimePoolDeployer = await MockTimeUniswapV3PoolDeployerFactory.deploy()
        console.log(`MockTimeUniswapV3PoolDeployer deployed to: ${await mockTimePoolDeployer.getAddress()}`)

        console.log('Deploying MockTimeUniswapV3Pool...')

        const tx = await mockTimePoolDeployer.deploy(
          await factory.getAddress(),
          await firstToken.getAddress(),
          await secondToken.getAddress(),
          fee,
          tickSpacing
        )
        const receipt = await tx.wait()

        let poolAddressFromLogs

        for (const log of receipt.logs) {
          try {
            const abi = ['event PoolDeployed(address pool)']
            const eventInterface = new ethers.Interface(abi)
            const decodedLog = eventInterface.decodeEventLog('PoolDeployed', log.data, log.topics)

            console.log('emitted event', decodedLog)
            poolAddressFromLogs = decodedLog[0]
            break
          } catch (err) {
            continue
          }
        }

        const poolAddress = poolAddressFromLogs || (await tx.getAddress())
        console.log(`Pool deployed to: ${poolAddress}`)

        const MockTimeUniswapV3PoolFactory = await zksyncEthers.getContractFactory('MockTimeUniswapV3Pool')
        return MockTimeUniswapV3PoolFactory.attach(poolAddress)
      } catch (error) {
        console.error('Error creating pool:', error)
        throw error
      }
    }

    const pool = await createPool(FeeAmount.MEDIUM, TICK_SPACINGS[FeeAmount.MEDIUM])
    // Deploy UniswapV3PoolSwapTest (for testing callbacks)
    console.log('Deploying UniswapV3PoolSwapTest...')
    const SwapCallee = await zksyncEthers.getContractFactory('TestUniswapV3Callee')
    const swapCallee = await SwapCallee.deploy()
    console.log(`SwapCallee deployed to: ${await swapCallee.getAddress()}`)

    const UniswapV3PoolSwapTestFactory = await zksyncEthers.getContractFactory('UniswapV3PoolSwapTest')
    const uniswapCallback = await UniswapV3PoolSwapTestFactory.deploy()

    console.log(`UniswapV3PoolSwapTest deployed to: ${await uniswapCallback.getAddress()}`)

    // Deploy CrossChainIntentEscrow
    console.log('Deploying CrossChainIntentEscrow...')
    const EscrowFactory = await zksyncEthers.getContractFactory('CrossChainIntentEscrow')
    const escrow = await EscrowFactory.deploy()
    console.log(`CrossChainIntentEscrow deployed to: ${await escrow.getAddress()}`)

    await pool.setMailboxAndEscrow(deployConfig.destination.nexusMailbox, await escrow.getAddress())

    // Log all the deployed addresses for easy reference
    console.log('\nDeployment Summary:')
    console.log('-------------------')

    console.log(`TestERC20 (token0): ${await token0.getAddress()}`)
    console.log(`TestERC20 (token1): ${await token1.getAddress()}`)
    console.log(`UniswapV3PoolSwapTest: ${await uniswapCallback.getAddress()}`)
    console.log(`CrossChainIntentEscrow: ${await escrow.getAddress()}`)
  }
}

async function main() {
  await deploy()
}

main().catch(console.error)
