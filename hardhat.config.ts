import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-sepolia.g.alchemy.com/v2/6mKLTOXCzi7zCWyre7bJnFzancfVY-9C",
        blockNumber: 600, // Replace with the block number you want to fork from
      },
    },
  },
};

export default config;
