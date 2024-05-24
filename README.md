## Installation

- Install Foundry ( with anvil )
- Install Node.js (v18 or above)

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
