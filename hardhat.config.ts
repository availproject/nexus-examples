import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-sepolia.g.alchemy.com/v2/6mKLTOXCzi7zCWyre7bJnFzancfVY-9C",
        blockNumber: 5966344,
      },
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/6mKLTOXCzi7zCWyre7bJnFzancfVY-9C",
    },
  },
};

export default config;
