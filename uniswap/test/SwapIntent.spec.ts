import { BigNumber, BigNumberish, Wallet } from 'ethers'
import { ethers, waffle } from 'hardhat'
import { OracleTest } from '../typechain/OracleTest'
import checkObservationEquals from './shared/checkObservationEquals'
import { expect } from './shared/expect'
import { TEST_POOL_START_TIME } from './shared/fixtures'
import snapshotGasCost from './shared/snapshotGasCost'
import { MaxUint128 } from './shared/utilities'

describe('SwapIntent', () => {
  it('should be able to create a swap intent', () => {})
})
