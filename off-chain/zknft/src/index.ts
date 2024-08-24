import { ethers } from "ethers";
import { Provider as L2Provider } from "zksync-ethers";
import nexusAbi from "./nexusStateManager.json";
import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import erc20Abi from "./erc20.json";
import diamondAbi from "./zksyncDiamond.json";
import { StorageProofProvider } from "./storageManager";
import axios from "axios";
import {
  stateManagerNFTChainAddr,
  storageNFTChainAddress,
  paymentTokenAddr,
  paymentContractAddress,
  diamondAddress,
  paymentZKSyncProviderURL,
  nftMintProviderURL,
  nexusRPCUrl,
  nexusAppID,
  amount,
  privateKeyGeth,
  privateKeyZkSync,
} from "./config";

async function main() {
  // 1. setup contracts across two chains

  let providerPayment = new L2Provider(paymentZKSyncProviderURL);
  let providerNFT = new ethers.JsonRpcProvider(nftMintProviderURL);
  let signerPayment = new ethers.Wallet(privateKeyZkSync, providerPayment);
  let signerNFT = new ethers.Wallet(privateKeyGeth, providerNFT);

  const stateManagerNFTChain = new ethers.Contract(
    stateManagerNFTChainAddr,
    nexusAbi,
    signerNFT
  );

  const storageNFTChain = new ethers.Contract(
    storageNFTChainAddress,
    nftContractAbi,
    signerNFT
  );
  const paymentContract = new ethers.Contract(
    paymentContractAddress,
    paymentAbi,
    signerPayment
  );

  const paymentToken = new ethers.Contract(
    paymentTokenAddr,
    erc20Abi,
    signerPayment
  );

  const zkSyncDiamond = new ethers.Contract(
    diamondAddress,
    diamondAbi,
    signerPayment
  );

  // 2. send payment on one chain ( payment chain )
  await sendPayment(paymentContract, paymentToken, signerPayment);
  let batchNumber = await fetchUpdatesFromNexus();
  // 3. get storage proof on the given chain
  await getStorageProof(
    providerNFT,
    providerPayment,
    paymentContract,
    zkSyncDiamond,
    batchNumber
  );
  // 4. update nexus state for the chain
  await updateNexusState(stateManagerNFTChain);
  // 5. provide the storage proof and get the nft on target chain
  await mintNFT();
}

async function fetchUpdatesFromNexus(): Promise<number> {
  try {
    let response = await axios.get(nexusRPCUrl + "/account", {
      params: {
        app_account_id: nexusAppID,
      },
    });

    return response.data.account.height;
  } catch (e) {
    console.log(e);
    return 0;
  }
}
async function sendPayment(
  paymentContract: ethers.Contract,
  paymentToken: ethers.Contract,
  signer: ethers.Wallet
) {
  await paymentContract.updatePrice(
    await paymentToken.getAddress(),
    amount / BigInt(2)
  );

  await paymentToken.mint(await signer.getAddress(), amount);
  await paymentToken.approve(await paymentContract.getAddress(), amount);

  await paymentContract.paymentWithoutFallback(
    "0x01",
    1337,
    amount,
    await paymentToken.getAddress()
  );

  console.log("320fj203fi");
  setTimeout(() => {
    console.log("waiting");
  }, 100 * 60);
}

async function getStorageProof(
  l1Provider: ethers.Provider,
  l2Provider: L2Provider,
  paymentContract: ethers.Contract,
  diamondContract: ethers.Contract,
  batchNumber: number
) {
  let storageProofProvider = new StorageProofProvider(
    new ethers.JsonRpcProvider("http://127.0.0.1:8545"),
    l2Provider,
    "0x1d2b23271e49351d9aee701b1b33bd1d03136aae"
  );

  const slot = 0;
  const key = 1;
  const slotBytes32 = ethers.zeroPadValue(ethers.toBeHex(slot), 32);
  const keyBytes32 = ethers.zeroPadValue(ethers.toBeHex(key), 32);

  // Concatenate key and slot
  const concatenated = ethers.concat([keyBytes32, slotBytes32]);

  // Calculate keccak256 hash
  const position = ethers.keccak256(concatenated);

  try {
    let proof = await storageProofProvider.getProof(
      await paymentContract.getAddress(),
      position,
      7
    );
    console.log(proof);
    return proof;
  } catch (e) {
    console.log(e);
  }
}

async function updateNexusState(stateManager: ethers.Contract) {}

async function mintNFT() {}

main();
