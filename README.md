## Overview

This repo contains demos that demonstrates some applications that can be created using Avail's nexus. You can read more about it [here](https://blog.availproject.org/avail-nexus-upgrade-enabling-crosschain-liquidity-at-scale/).

Currently the ZKNFT demo can be run on your machines to interact with nexus and understand the architecture.

The demo at the moment can be run as a CLI, and it demonstrates a rather simple use case of Minting NFT on one chain, on confirmation of payment on another chain. Payments are verified through state verification of nexus, that intrinsically verifies the state of the chain where payment is being made.

Follow the guide below to setup and run the demo on your machines.

## Pre-requisites

- Install Foundry
- Install Node.js (v18 or above)

## Setup

### 1. Setup and run zksync chains

- Clone Repo
  ```
  git clone https://github.com/vibhurajeev/zksync-era
  ```
- Follow instructions in [setup-dev.md](https://github.com/vibhurajeev/zksync-era/blob/main/docs/guides/setup-dev.md) to setup your environment.

- Initiate Zksync ecosystem:

  ```zsh
  zk_inception containers
  zk_inception ecosystem init
  ```

- Replace any `./db/../` paths in general.yaml in `chains/era/configs` with in `./chains/era/db/../`.
- Replace any `./db/../` paths in general.yaml in `chains/era2/configs` with in `./chains/era2/db/../`..

- Now run:

  ```
  zk_inception server
  zk_inception server --chain era2
  ```

- Bridge funds to your accounts on zksync chains to be able to run the demo by following instructions [here](https://github.com/vibhurajeev/zksync-era/blob/main/docs/guides/advanced/02_deposits.md).

  Use below command to bridge to era2:

  ```
  npx zksync-cli bridge deposit --chain=dockerized-node --amount 3 --pk=0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6 --to=0x618263CE921F7dd5F4f40C29f6c524Aaf97b9bbd --rpc http://127.0.0.1:4050
  ```

- For more details on zksync cli refer [here](https://github.com/vibhurajeev/zksync-era/blob/main/zk_toolbox/README.md)

### 2. Setup and Run Nexus

- **Clone the Nexus Repository**:

  - Begin by cloning the Nexus repository from GitHub:
    ```bash
    git clone https://github.com/availproject/nexus.git
    cd nexus
    ```

- **Set Up and First Run the Nexus Instance**:

  - Follow the detailed setup guide [here](https://github.com/availproject/nexus/blob/main/docs/development/1_getting_started.md) to set up and run the Nexus instance for the first time.

- **Run the ZKSync Adapter for Nexus**:
  - After setting up Nexus, run the ZKSync adapter by following the guidelines provided [here](https://github.com/availproject/nexus/blob/main/docs/development/2_zksync_example.md).

<details>
  <summary>ZK NFT Example ( without mailbox )</summary>

### 3. Contract Deployment:

#### Automatic

```
chmod +x deploy.sh
./deploy.sh
```

#### Manual

If you prefer a more manual approach, you can follow the guidelines below:

- Deploy relevant contracts on origin chain and the JMT verifier library on recipient chain:

  ```
  npx hardhat run scripts/3_zksync.ts --network zksync
  npx hardhat run scripts/5_jmt.ts --network zksync2 (This needs to be done only the first time.)
  ```

- After this use the address of the deployed JMT and update inside `hardhat.config.ts` inside zksolc: `JellyfishMerkleTreeVerifier` address with new one deployed in the last step.

- Finally run the below command to deploy remaining contracts on recipient chain.

  ```
  npx hardhat run scripts/4_zksync2.ts --network zksync2
  ```

## Test

To run tests with values pre-populated ( or new ones by running the rust scripts above ):

`forge test`

## Running the demo

You can choose to use a CLI to test the flow, or alternatively run the frontend demo. Below are instructions for both.

### Frontend

- Go to nft ui directory

  ```
  cd frontend/nft-ui
  ```

- Install npm modules and run the frontend.

  ```
  npm install
  npm run dev
  ```

- Go to payments ui directory

  ```
  cd frontend/payments-ui
  ```

- Install npm modules and run the frontend.

  ```
  npm install
  npm run dev
  ```

The demo should be running [here](http://localhost:3000/).

### CLI

- If you choose to run the script instead first copy the env:

  ```
  cp .env.example .env   // fill all the variables
  cd off-chain/zknft/
  touch src/config.ts
  ```

Now you are ready to pay on one chain and get nft on another using nexus:

```
ts-node ./src/index.ts
```

</details>

<details>
<summary>ZK NFT ( with mailbox )</summary>

### 3. Contract Deployment:

#### Automatic

```
chmod +x deploy-mailbox.sh
./deploy-mailbox.sh
```

## Running the demo

You can choose to use a CLI to test the flow. Below are instructions for both.

### CLI

- If you choose to run the script instead first copy the env:

  ```
  cd off-chain/zknft-mailbox/  // Open index.ts and update the constants if required
  npm run build
  npm run start
  ```

Now you are ready to pay on one chain and get nft on another using nexus:

```
ts-node ./src/index.ts
```

</details>

There are mock hardcoded entries inside `test` folder that you can try out.
Alternatively, there are scripts in `off-chain` folder to fetch new proofs and state roots on a given rpc chain. Simply change the target inside `main` like contract address etc. and get the new storage proof.
A good read around storage proof is [here](https://coinsbench.com/solidity-layout-and-access-of-storage-variables-simply-explained-1ce964d7c738)
