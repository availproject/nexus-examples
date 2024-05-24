import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const StorageVerifier = await ethers.getContractFactory("StorageProof");
  const storageVerifier = await StorageVerifier.deploy(1337, 1338);

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
