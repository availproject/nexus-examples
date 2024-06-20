## Installation

- Install Foundry ( with anvil )
- Install Node.js (v18 or above)

## Deployments

1. Polygon ZK EVM Cardona Testnet:

   ```
    Deploying contracts with the account: 0x6aE5A61BF6067a2f30AC5e51d6b194D426b2F303
    NexusProofManager deployed to: 0xbAF9FeA491658219c0D1c438dCB7e09108dF175F
    Bridge deployed to: 0x2950e92BC3cD16a1eADbC4eD5df2E838d259017A
    Avail Token: 0x439fe775eE7224F5564F0684a115db63189c18aF
    WETH address: 0xD642e7BFc303BF1Fa64F974BA976843dbBb8481B
    Asset Id 0x7765746800000000000000000000000000000000000000000000000000000000
   ```

2. Arbitrum:

   ```
   Deploying contracts with the account: 0x6aE5A61BF6067a2f30AC5e51d6b194D426b2F303
   NexusProofManager deployed to: 0x9A4Ea430637136fE487fdfe5218A78403B5D5A47
   Bridge deployed to: 0x34e45Fc2f0BaDB03a680Ec37d5F69eD1a7835aDa
   Avail Token: 0x72Db81Aa3CE124863459ae6AABD3dC0361771698

   ```

3. Sepolia ( not used in POC demo video):
   ```
   Deploying contracts with the account: 0x6aE5A61BF6067a2f30AC5e51d6b194D426b2F303
   NexusProofManager deployed to: 0x441DD9F56713f5A743e9E05C8383A95882EA90eb
   Bridge deployed to: 0x29AC7306b3E1d970955f9a22164Fa51005fd0023
   Avail Token: 0xfA7AE062C74f0A73FBcAcb25FdB71Ae4f2D2CCbB
   WETH address: 0xFaE9D7cA16eb9056d90A90A0190E8c39f23aFC8E
   Asset Id 0x7765746800000000000000000000000000000000000000000000000000000000
   ```

## Usage

There are mock hardcoded entries inside `test` folder that you can try out.
Alternatively, there are scripts in `off-chain` folder to fetch new proofs and state roots on a given rpc chain. Simply change the target inside `main` like contract address etc. and get the new storage proof.
A good read around storage proof is [here](https://coinsbench.com/solidity-layout-and-access-of-storage-variables-simply-explained-1ce964d7c738)

Spin up local nodes:

```
 anvil --chain-id 1337 --port 8545
 anvil --chain-id 1338 --port 8546
```

Contract Deployment:

```
npx hardhat run scripts/deploy.ts --network node
npx hardhat run scripts/deploy.ts --network node2
```

Note: deployment sets the chain ids destination, target, 1337, 1338 respectively. This is additional info in the contract, hardcoded in deployment scripts. Can be changed there directly.

To run tests with values pre-populated ( or new ones by running the rust scripts above ):

`npx hardhat test`

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```
