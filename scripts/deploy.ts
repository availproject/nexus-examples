// scripts/deploy.js

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy the library first
  const LibSecureMerkleTrie = await ethers.getContractFactory(
    "Lib_SecureMerkleTrie"
  );
  const libSecureMerkleTrie = await LibSecureMerkleTrie.deploy();

  console.log("Library deployed to:", await libSecureMerkleTrie.getAddress());

  // Link the library to the contract
  const StorageVerifier = await ethers.getContractFactory("StorageVerifier", {
    libraries: {
      Lib_SecureMerkleTrie: await libSecureMerkleTrie.getAddress(),
    },
  });
  const storageVerifier = await StorageVerifier.deploy();

  console.log(
    "StorageVerifier deployed to:",
    await storageVerifier.getAddress()
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
