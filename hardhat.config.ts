import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@foundry-rs/hardhat-anvil";
import "@matterlabs/hardhat-zksync";

import dotenv from "dotenv";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
dotenv.config();

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest",
    settings: {
      libraries: {
        "contracts/lib/JellyfishMerkleTreeVerifier.sol": {
          JellyfishMerkleTreeVerifier:
            "0x4D50015B093cb8ea493Eda2711401Ec1368579BC",
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
    zksync2: {
      chainId: 272,
      url: "http://127.0.0.1:4050",
      ethNetwork: "sepolia",
      accounts: [
        "0xc76bee37a768a74d893d86041a6339bab150679c14c273a33afff53874f87b42",
      ],
      zksync: true,
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
