import { NFT, Menu, MenuType, Message, RpcProof, NexusInfo, TransferStatus } from './types';
import { hexToAddress, } from "./utils";
import * as ed from '@noble/ed25519';
import { bytesToHex, hexToNumberString } from "web3-utils";
import { sha512 } from '@noble/hashes/sha512';
import nftContractAbi from "./nft.json";
import paymentAbi from "./payment.json";
import nexusAbi from "./nexusStateManager.json";
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { Provider, types } from 'zksync-ethers';
import { nexusAppID, nexusRPCUrl, nftMintProviderURL, paymentContractAddress, privateKeyZkSync2, stateManagerNFTChainAddr, storageNFTChainAddress } from './config';
import { StorageProofProvider } from './storageManager';
import axios from 'axios';


function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function getProvider(): Provider {
  let provider = new Provider(nftMintProviderURL);

  return provider;
}

export function getBuyerWallet(provider?: Provider): Wallet {
  return new Wallet(privateKeyZkSync2, provider)
}

export async function mintNFT(
  nexus: NexusInfo,
  proof: RpcProof,
  message: Message,
  batchNumber: number
): Promise<any | undefined> {
  try {
    let provider: Provider = getProvider();
    let signer: Wallet = getBuyerWallet(provider);
    const nftContract = new Contract(
      storageNFTChainAddress,
      nftContractAbi,
      signer
    );

    const stateManagerNFTChain = new Contract(
      stateManagerNFTChainAddr,
      nexusAbi,
      signer
    );

    console.debug("Updating nexus state on nft chain");
    //@ts-ignore
    await stateManagerNFTChain.updateNexusBlock(nexus.chainStateNumber, nexus.info);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    //@ts-ignore
    await stateManagerNFTChain.updateChainState(
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

    //@ts-ignore
    const stateInfo = await stateManagerNFTChain.getChainState(0, "0x" + nexusAppID);
    console.debug("State Info: ", stateInfo);
    console.debug("Successfully completed state manager updates");

    await sleep(2000);

    const nonce = await provider.getTransactionCount(signer.address, "latest");
    //@ts-ignore
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
    console.debug("Mint NFT triggered successfully");

    return receipt;
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}


export async function getStorageProof(
  batchNumber: number,
  id: number
): Promise<RpcProof | undefined> {
  //NFT Chain provider
  let provider: Provider = Provider.getDefaultProvider(types.Network.Localhost);
  const paymentContract = new Contract(
    paymentContractAddress,
    paymentAbi,
    provider
  );
  let storageProofProvider = new StorageProofProvider(
    provider,
  );

  //@ts-ignore
  let storageLocation = await paymentContract.getStorageLocationForKey(id);

  try {
    let proof = await storageProofProvider.getProof(
      await paymentContract.getAddress(),
      storageLocation,
      batchNumber
    );

    return proof;
  } catch (e) {
    console.debug(e);
  }
}

// export async function checkPayment(message: Message, recipient: string): Promise<TransferStatus> {
//   let provider: Provider = getProvider();
//   const nftContract = new Contract(
//     storageNFTChainAddress,
//     nftContractAbi,
//     provider
//   );

//   nftContract.ownerOf(message.messageId)
// }

export async function fetchUpdatesFromNexus(): Promise<NexusInfo | undefined> {
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
    console.log("error", e);
    return undefined;
  }
}

export async function getMenu(type: MenuType): Promise<Menu[]> {
  if (type == MenuType.main) {
    return [
      {
        title: "Home",
        path: "/"
      },
      {
        title: "About",
        path: "/about"
      }
    ]
  } else {
    return [
      {
        title: "Home",
        path: "/"
      },
      {
        title: "About",
        path: "/about"
      }
    ];
  }
}

