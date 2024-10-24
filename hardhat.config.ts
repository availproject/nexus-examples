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
  },
  solidity: {
    version: "0.8.21",
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
        "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6",
      ],
      zksync: true,
    },
    zksync2: {
      chainId: 272,
      url: "http://127.0.0.1:4050",
      ethNetwork: "sepolia",
      accounts: [
        "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6",
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
