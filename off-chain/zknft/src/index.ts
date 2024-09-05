import { ethers } from "ethers";
import { Provider as L2Provider, types } from "zksync-ethers";
import nexusAbi from "./nexusStateManager.json";
import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import erc20Abi from "./erc20.json";
import diamondAbi from "./zksyncDiamond.json";
import { RpcProof, StorageProofProvider } from "./storageManager";
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
  privateKeyZkSync2,
  privateKeyZkSync,
} from "./config";

type NexusState = {
  stateRoot: string;
  blockHash: string;
};

type NexusInfo = {
  info: NexusState;
  chainStateNumber: number;
  response: {
    account: {
      statement: string;
      state_root: string;
      start_nexus_hash: string;
      last_proof_height: number;
      height: number;
    };
    proof: string[];
    value_hash: string;
    nexus_header: {
      parent_hash: string;
      prev_state_root: string;
      state_root: string;
      avail_header_hash: string;
      number: number;
    };
  };
};

type Message = {
  messageType: string;
  from: string;
  data: string;
  messageId: number;
  chainId: number;
};

async function main() {
  // 1. setup contracts across two chains

  let providerPayment = L2Provider.getDefaultProvider(types.Network.Localhost);
  let providerNFT = new L2Provider(nftMintProviderURL);
  if (!providerPayment) {
    return;
  }
  let signerPayment = new ethers.Wallet(privateKeyZkSync, providerPayment);
  let signerNFT = new ethers.Wallet(privateKeyZkSync2, providerNFT);

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
  let message = await sendPayment(
    providerPayment,
    paymentContract,
    paymentToken,
    signerPayment
  );
  let nexus = await fetchUpdatesFromNexus();
  if (!nexus) {
    return;
  }

  // 3. get storage proof on the given chain
  let proof = await getStorageProof(
    providerNFT,
    providerPayment,
    paymentContract,
    zkSyncDiamond,
    nexus.chainStateNumber,
    message.messageId
  );

  // 4. update nexus state for the chain
  await updateNexusState(stateManagerNFTChain, nexus);
  if (!proof) {
    return;
  }
  // 5. provide the storage proof and get the nft on target chain
  await mintNFT(
    providerNFT,
    storageNFTChain,
    proof,
    signerNFT,
    message,
    nexus.chainStateNumber
  );
}

async function fetchUpdatesFromNexus(): Promise<NexusInfo | undefined> {
  await sleep();

  try {
    let response = await axios.get(nexusRPCUrl + "/account-hex", {
      params: {
        app_account_id: nexusAppID,
      },
    });

    return {
      chainStateNumber: response.data.account.height,
      info: {
        stateRoot: "0x" + response.data.nexus_header.state_root,
        blockHash: "0x" + response.data.nexus_header.state_root, // fix
      },
      response: response.data,
    };
  } catch (e) {
    console.log(e);
    return undefined;
  }
}
async function sendPayment(
  l2Provider: L2Provider,
  paymentContract: ethers.Contract,
  paymentToken: ethers.Contract,
  signer: ethers.Wallet
): Promise<Message> {
  try {
    await paymentContract.updatePrice(
      await paymentToken.getAddress(),
      amount / BigInt(2)
    );

    await paymentToken.mint(await signer.getAddress(), amount);
    await paymentToken.approve(await paymentContract.getAddress(), amount);

    const tx = await paymentContract.paymentWithoutFallback(
      "0x01",
      1337,
      amount,
      await paymentToken.getAddress()
    );

    const receipt = await tx.wait();

    const txDetails = await l2Provider.getTransactionReceipt(receipt.hash);
    console.log(txDetails);
    const preImageEvents = txDetails!.logs.filter(
      (log) =>
        log.topics[0] ===
        ethers.id("PreImage(bytes1,bytes32,bytes,uint256,uint256)")
    );

    const parsedEvents = preImageEvents.map((event) => {
      const [messageType, from, data, messageId, chainId] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["bytes1", "bytes32", "bytes", "uint256", "uint256"],
          event.data
        );

      return {
        messageType,
        from,
        data,
        messageId: messageId.toString(),
        chainId: chainId.toString(),
      };
    });
    const val = await paymentContract.getValueFromId(parsedEvents[0].messageId);
    console.log(val);

    return parsedEvents[0];
  } catch (e) {
    console.error("error", e);
    process.exit(1);
  }
}

function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function getStorageProof(
  l1Provider: ethers.Provider,
  l2Provider: L2Provider | undefined,
  paymentContract: ethers.Contract,
  diamondContract: ethers.Contract,
  batchNumber: number,
  id: number
): Promise<RpcProof | undefined> {
  if (l2Provider) {
    let storageProofProvider = new StorageProofProvider(
      new ethers.JsonRpcProvider("http://127.0.0.1:8545"),
      l2Provider,
      "0x1d2b23271e49351d9aee701b1b33bd1d03136aae"
    );

    let storageLocation = await paymentContract.getStorageLocationForKey(id);
    console.log(batchNumber, id);
    try {
      let proof = await storageProofProvider.getProof(
        await paymentContract.getAddress(),
        storageLocation,
        batchNumber
      );

      return proof;
    } catch (e) {
      console.log(e);
    }
  } else {
    return undefined;
  }
}

async function updateNexusState(
  stateManager: ethers.Contract,
  nexus: NexusInfo
) {
  console.log("Updating nexus state on nft chain");
  console.log(
    nexus.info,
    nexus.chainStateNumber,
    nexus.response.proof,
    "0x" + nexusAppID,
    {
      statementDigest: "0x" + nexus.response.account.statement,
      stateRoot: "0x" + nexus.response.account.state_root,
      startNexusHash: "0x" + nexus.response.account.start_nexus_hash,
      lastProofHeight: nexus.response.account.last_proof_height,
      height: nexus.response.account.height,
    }
  );
  await stateManager.updateNexusBlock(nexus.chainStateNumber, nexus.info);
  console.log("passing this");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await stateManager.updateChainState(
    nexus.chainStateNumber,
    nexus.response.proof,
    "0x" + nexusAppID,
    {
      statementDigest: "0x" + nexus.response.account.statement,
      stateRoot: "0x" + nexus.response.account.state_root,
      startNexusHash: "0x" + nexus.response.account.start_nexus_hash,
      lastProofHeight: nexus.response.account.last_proof_height,
      height: nexus.response.account.height,
    }
  );

  const stateInfo = await stateManager.getChainState(0, "0x" + nexusAppID);
  console.log("state info", stateInfo);
  console.log("Successfully completed state manager updates");
}

async function mintNFT(
  provider: ethers.Provider,
  nftContract: ethers.Contract,
  proof: RpcProof,
  signer: ethers.Wallet,
  message: Message,
  batchNumber: number
) {
  console.log(signer.address, message, { ...proof, batchNumber });
  try {
    await sleep(2000);
    const nonce = await provider.getTransactionCount(signer.address, "latest");
    let tx = await nftContract.mintNFT(
      signer.address,
      message,
      {
        ...proof,
        batchNumber,
      },
      { nonce }
    );

    let receipt = await tx.wait();

    console.log("Mint NFT triggered successfully");
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main();
