import ethers from "ethers";
import { Provider as L2Provider } from "zksync-ethers";
import nexusAbi from "./nexusStateManager.json";
import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import erc20Abi from "./erc20.json";
import diamondAbi from "./zksyncDiamond.json";
import { StorageProofProvider } from "./storageManager";
import axios from "axios";
import {
  stateManagerNFTChain,
  storageNFTChainAddress,
  paymentTokenAddr,
  paymentContractAddress,
  diamondAddress,
  paymentZKSyncProviderURL,
  nftMintProviderURL,
  nexusRPCUrl,
  nexusAppID,
  amount,
} from "./config";

async function main() {
  // 1. setup contracts across two chains
  let providerPayment = new L2Provider(paymentZKSyncProviderURL);
  let providerNFT = new ethers.JsonRpcProvider(nftMintProviderURL);
  let signerPayment = await providerPayment.getSigner();
  let signerNFT = await providerNFT.getSigner();
  const stateManagerNFTChain = new ethers.Contract(
    stateManagerNFTChain,
    nexusAbi,
    providerNFT
  );

  const storageNFTChain = new ethers.Contract(
    storageNFTChainAddress,
    nftContractAbi,
    providerNFT
  );
  const paymentContract = new ethers.Contract(
    paymentContractAddress,
    paymentAbi,
    providerPayment
  );

  const paymentToken = new ethers.Contract(
    paymentTokenAddr,
    erc20Abi,
    providerPayment
  );

  const zkSyncDiamond = new ethers.Contract(
    diamondAddress,
    diamondAbi,
    providerPayment
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
  await updateNexusState();
  // 5. provide the storage proof and get the nft on target chain
  await mintNFT();
}

async function fetchUpdatesFromNexus(): Promise<number> {
  let response = await axios.get(nexusRPCUrl, {
    params: {
      app_account_id: nexusAppID,
    },
  });
  console.log(response.data);
  return response.data.batchNumber;
}
async function sendPayment(
  paymentContract: ethers.Contract,
  paymentToken: ethers.Contract,
  signer: ethers.ethers.JsonRpcSigner
) {
  paymentToken.mint(await signer.getAddress(), 2 * amount);
  paymentToken.approve(await paymentContract.getAddress(), 2 * amount);
  await paymentContract.paymentWithoutFallback(
    "0x01",
    137,
    amount,
    await paymentToken.getAddress()
  );
}

async function getStorageProof(
  l1Provider: ethers.Provider,
  l2Provider: L2Provider,
  paymentContract: ethers.Contract,
  diamondContract: ethers.Contract,
  batchNumber: number
) {
  let storageProofProvider = new StorageProofProvider(
    l1Provider,
    l2Provider,
    await diamondContract.getAddress() // not relevant for us
  );

  let slot = "";
  storageProofProvider.getProof(
    await paymentContract.getAddress(),
    slot,
    batchNumber
  );
}

async function updateNexusState() {}

async function mintNFT() {}

main();
