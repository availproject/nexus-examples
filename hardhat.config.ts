import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@foundry-rs/hardhat-anvil";
import "@matterlabs/hardhat-zksync";

import dotenv from "dotenv";
import { vars } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
dotenv.config();

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest",
    settings: {
      libraries: {
        "contracts/lib/JellyfishMerkleTreeVerifier.sol": {
          JellyfishMerkleTreeVerifier:
            "0x2D60d2a35Dc1dD64b2E0a8eCB06887728a869185",
        },
      },
    },
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      zksync: false,
    },
    node: {
      chainId: 1337,
      url: "http://127.0.0.1:3100",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ],
      zksync: false,
    },
    node2: {
      chainId: 1338,
      url: "http://127.0.0.1:8546",
      zksync: false,
    },
    zksync: {
      chainId: 271,
      url: "http://127.0.0.1:3050",
      ethNetwork: "sepolia",
      accounts: [
        "0x2d64990aa363e3d38ae3417950fd40801d75e3d3bd57b86d17fcc261a6c951c6",
      ],
      zksync: true,
    },
    arbitrum: {
      url: process.env.RPC_PROVIDER_ORIGIN,
      accounts: [
        "0x2d64990aa363e3d38ae3417950fd40801d75e3d3bd57b86d17fcc261a6c951c6",
      ],
      zksync: false,
    },
    polygonZKEvm: {
      url: process.env.RPC_PROVIDER_DESTINATION,
      accounts: [
        "0x2d64990aa363e3d38ae3417950fd40801d75e3d3bd57b86d17fcc261a6c951c6",
      ],
      zksync: false,
    },
  },
  etherscan: {
    apiKey: "IIRQ3N1AQXTTTJW9K7HFSA6WAZV25CKCSP",
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
};

export default config;
