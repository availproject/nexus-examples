## Installation

- Install Foundry ( with anvil )
- Install Node.js (v18 or above)

## Usage

There are mock hardcoded entries inside `test` folder that you can try out.
Alternatively, there are scripts in `off-chain` folder to fetch new proofs and state roots on a given rpc chain. Simply change the target inside `main` like contract address etc. and get the new storage proof.
A good read around storage proof is [here](https://coinsbench.com/solidity-layout-and-access-of-storage-variables-simply-explained-1ce964d7c738)

> Spin up 2 instances of ZK Sync using the relevant instructions.

Contract Deployment:

```
npx hardhat run scripts/3_zksync.ts --network zksync
npx hardhat run scripts/5_jmt.ts --network zksync2
```

- After this use the address of JMT and update inside `hardhat.config.ts` inside zksolc: `JellyfishMerkleTreeVerifier` address with this new one.

```
npx hardhat run scripts/4_zksync2.ts --network zksync2
```

To run tests with values pre-populated ( or new ones by running the rust scripts above ):

`forge test`

- Now to run the script

```
cp .env.example .env   // fill all the variables
cd off-chain/zknft/
touch src/config.ts
```

Add the following values inside config.ts:

```
import { ethers } from "ethers";

export const stateManagerNFTChainAddr = "";
export const storageNFTChainAddress ="";
export const diamondAddress = "";
export const paymentTokenAddr = "";
export const paymentContractAddress ="";
export const paymentZKSyncProviderURL = "";
export const nftMintProviderURL = "";
export const nexusRPCUrl = "";
export const nexusAppID = "";
export const privateKeyZkSync = "";
export const privateKeyZkSync2 =""
export const amount = "";
```

> Use the addresses logged during the deployment step and fill these values

Now you are ready to pay on one chain and get nft on another using nexus:

```
ts-node ./src/index.ts
```
