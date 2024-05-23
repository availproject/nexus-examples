import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const LibSecureMerkleTrie = await ethers.getContractFactory(
    "Lib_SecureMerkleTrie"
  );
  const libSecureMerkleTrie = await LibSecureMerkleTrie.deploy();

  console.log("Library deployed to:", await libSecureMerkleTrie.getAddress());

  const LibRLPReader = await ethers.getContractFactory("Lib_RLPReader");
  const libRLPReader = await LibRLPReader.deploy();

  console.log("Library deployed to:", await libRLPReader.getAddress());

  const StorageVerifier = await ethers.getContractFactory("StorageVerifier", {
    libraries: {
      Lib_SecureMerkleTrie: await libSecureMerkleTrie.getAddress(),
      Lib_RLPReader: await libRLPReader.getAddress(),
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
