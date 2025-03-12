import { zksyncEthers } from 'hardhat'

async function deploy() {
  const [deployer] = await zksyncEthers.getSigners()
  console.log(`Deployer address: ${deployer.address}`)
  const nexusFactory = await zksyncEthers.getContractFactory('Nexus')
  const nexus = await nexusFactory.deploy()
  await nexus.deployed()
  console.log(`Nexus deployed to: ${nexus.address}`)
}

async function main() {
  await deploy()
}

main().catch(console.error)
