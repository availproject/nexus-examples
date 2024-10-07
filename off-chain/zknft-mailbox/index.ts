import { ethers } from "ethers";
import { Provider as L2Provider, types } from "zksync-ethers";
import nexusMailboxAbi from "./nexus_mailbox.json";
import erc20Abi from "./erc20.json";
import nexusStateManagerAbi from "./nexusStateManager.json";
import axios from "axios";
import paymentAbi from "./payment.json";
import nftAbi from "./nft.json";

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

interface MailboxMessage {
  nexusAppIdFrom: string; // bytes32 -> string
  nexusAppIdTo: string[]; // bytes32[] -> string[]
  data: string; // bytes -> string
  from: string; // address -> string
  to: string[]; // address[] -> string[]
  nonce: number | string; // uint256 -> number or string for large numbers
}

let nexusRPCUrl = "";
let zksync_nft_url = "";
let zksync_payment_url = "";
let privateKeyZkSync = "";
let privateKeyZkSync2 = "";
let stateManagerNFTChainAddr = "";
let paymentContractAddress = "";
let paymentTokenAddr = "";
let nftContractAddress = "";
let tokenId = 2;
let amount = "10";
let app_id =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let app_id_2 =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let nonce = 1;

async function main() {
  // 1. Deploy contracts: Mailbox + Nexus state manager  - done
  // 2. Deploy nft contracts on different chains - done
  // 3. Lock nft on one chain and pay on another chain
  // 4. Receive on NFT using inclusiong proof.
  // 5. Lock nft on one chain
  // 6. Withdraw nft using exclusion proof after timeout
  let providerPayment = L2Provider.getDefaultProvider(types.Network.Localhost);
  let providerNFT = new L2Provider(zksync_nft_url);
  if (!providerPayment) {
    return;
  }

  let signerPayment = new ethers.Wallet(privateKeyZkSync, providerPayment);
  let signerNFT = new ethers.Wallet(privateKeyZkSync2, providerNFT);

  const stateManagerNFTChain = new ethers.Contract(
    stateManagerNFTChainAddr,
    nexusStateManagerAbi,
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

  const nftContract = new ethers.Contract(
    nftContractAddress,
    nftAbi,
    signerNFT
  );

  // this shouldn't be hardcoded, rather should be managed by sc. Doing it here since need time to write code
  // to get nft id from events if done via sc.
  await nftContract.mint(tokenId);

  async function scenario1() {
    // 3. Lock nft on one chain and pay on another chain
    // 4. Receive on NFT using inclusiong proof.
    await lockNFT();
    await fetchUpdatesFromNexus();
    // following available via sdk now:
    // await updateNexusState(); // from sdk
    // await updateChainState(); // from sdk
    // await getPaymentProof(); using zksync adapter ( class ) in sdk, from sdk
    // await receiveNFT();
  }

  async function scenario2() {
    // 5. Lock nft on one chain
    // 6. Withdraw nft using exclusion proof after timeout
    let lockHash = await lockNFT();
    await fetchUpdatesFromNexus();
    await withdrawNFT(lockHash);
  }

  async function lockNFT() {
    const tx = await nftContract.lockNFT(
      tokenId,
      ethers.parseEther("1"),
      await paymentToken.getAddress()
    );

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    // Filter the LockHash event from the transaction receipt
    const lockHashEvent = receipt.events?.find(
      (event: any) => event.event === "LockHash"
    );

    // If the event exists, extract the lockHash
    if (lockHashEvent) {
      const lockHash = lockHashEvent.args?.lockHash;
      console.log("LockHash:", lockHash);
      return lockHash;
    } else {
      console.log("LockHash event not found");
    }
  }

  async function payForNFT() {
    await paymentToken.mint(
      await signerPayment.getAddress(),
      ethers.parseEther(amount)
    );
    // the below sends message to mailbox
    await paymentContract.pay(
      await paymentToken.getAddress(),
      ethers.parseEther("1"),
      tokenId,
      nonce,
      await signerNFT.getAddress()
    );
  }

  async function receiveNFT(message: MailboxMessage, proof: string) {
    try {
      // fetch message info from mailbox using sdk
      await nftContract.transferNFT(0, message, proof);
      console.log("NFT Transfered....");
    } catch {
      console.log("NFT Transfer failed");
    }
  }

  async function withdrawNFT(lockHash: string) {
    let proof;
    // sdk.zksync.getProof()
    nftContract.withdrawNFT(lockHash, proof);
  }

  async function fetchUpdatesFromNexus(): Promise<NexusInfo | undefined> {
    await sleep();

    try {
      let response = await axios.get(nexusRPCUrl + "/account-hex", {
        params: {
          app_account_id: app_id,
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
}

function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000;
  return new Promise((resolve) => setTimeout(resolve, duration));
}
