import { ethers, Log, TransactionReceipt, Provider, keccak256 } from "ethers";
import { Provider as L2Provider, types } from "zksync-ethers";
import nexusMailboxAbi from "./nexus_mailbox.json" with { type: "json" };
import erc20Abi from "./erc20.json" with { type: "json" };
import nexusStateManagerAbi from "./nexusStateManager.json" with { type: "json" };
import axios from "axios";
import paymentAbi from "./payment.json" with { type: "json" };
import nftAbi from "./nft.json" with { type: "json" };
import mailboxAbi from "./nexus_mailbox.json"  with { type: "json" };
import { NexusClient, MailBoxClient, ProofManagerClient, ZKSyncVerifier } from "nexus-js";
import { AccountApiResponse } from "nexus-js";
import { Networks } from "nexus-js";
import { MailboxMessageStruct } from "nexus-js";
import { AbiCoder } from "ethers";
import { ParamType } from "ethers";

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
  nexusAppIDFrom: string; // bytes32 -> string
  nexusAppIDTo: string[]; // bytes32[] -> string[]
  data: string; // bytes -> string
  from: string; // address -> string
  to: string[]; // address[] -> string[]
  nonce: bigint | string; // uint256 -> number or string for large numbers
}

interface PaymentReceipt {
  from: string;
  to: string;
  nftId: string;
  amount: string;
  tokenAddress: string;
}

let nexusRPCUrl = "http://127.0.0.1:7000";
let zksync_nft_url = "http://127.0.0.1:3052";
let zksync_payment_url = "http://127.0.0.1:3150";
let privateKeyZkSync = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let privateKeyZkSync2 = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let stateManagerNFTChainAddr = "0x51f1C6ae207884CF6bCA67d4c0e83f09Ab013f3d";
let paymentContractAddress = "0xbd8597e7cd50E16de71A8402aaB52b67717B486E";
let paymentTokenAddr = "0x053f7d36Ba59d0366A94b89D283d276AB893Effc";
let nftContractAddress = "0x1D48fC61b008a55Ea438696E9280f0Fca1Cc60b8";
let tokenId = 4;
let amount = "10";
let app_id =
  "0x3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
let app_id_2 =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";

//69b0257ca5f3ca861e5d56243f95cb3cc15ece5491deb561fff4c39546291296
async function main() {
  // 1. Deploy contracts: Mailbox + Nexus state manager  - done
  // 2. Deploy nft contracts on different chains - done
  // 3. Lock nft on one chain and pay on another chain
  // 4. Receive on NFT using inclusiong proof.
  // 5. Lock nft on one chain
  // 6. Withdraw nft using exclusion proof after timeout
  const nftNexusClient = new NexusClient(
    nexusRPCUrl,
    app_id
  );
  const paymentNexusClient = new NexusClient(
    nexusRPCUrl,
    app_id_2
  );
  // const mailbox = new nexus.MailBoxClient({
  //   `${app_id}` : nexus.
  // })
  //  const zksyncVerifier = new nexus.ZKSyncVerifier();
  let providerPayment = new L2Provider(zksync_payment_url);
  let providerNFT = new L2Provider(zksync_nft_url);
  if (!providerPayment) {
    return;
  }

  let signerPayment = new ethers.Wallet(privateKeyZkSync, providerPayment as unknown as Provider);
  let signerNFT = new ethers.Wallet(privateKeyZkSync2, providerNFT as unknown as Provider);

  const stateManagerNFTChain = new ethers.Contract(
    stateManagerNFTChainAddr,
    nexusStateManagerAbi,
    signerNFT
  );

  const paymentContract = new ethers.Contract(
    paymentContractAddress,
    paymentAbi.abi,
    signerPayment
  );

  const paymentToken = new ethers.Contract(
    paymentTokenAddr,
    erc20Abi,
    signerPayment
  );

  const nftContract = new ethers.Contract(
    nftContractAddress,
    nftAbi.abi,
    signerNFT
  );
  const proofManagerClient = new ProofManagerClient(stateManagerNFTChainAddr, zksync_nft_url, privateKeyZkSync);
  const tx = await nftContract.setNftPaymentContractAddress(paymentContractAddress);
  const receipt = await tx.wait();

  // this shouldn't be hardcoded, rather should be managed by sc. Doing it here since need time to write code
  // to get nft id from events if done via sc.
  await nftContract.mint(tokenId);
  console.log("✅ minted NFT with token ID", tokenId);
  await sleep(5000);

  await scenario1();

  async function scenario1() {
    // 3. Lock nft on one chain and pay on another chain
    // 4. Receive on NFT using inclusiong proof.
    const lockNFTResult = await lockNFT();
    console.log("Lock NFT Result", lockNFTResult)

    const paymentBlockNumber = await payForNFT();
    console.log("Payment Result", paymentBlockNumber);


    const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(paymentNexusClient, paymentBlockNumber);
    console.log("Nexus state already updated! ✅ \n");
    //console.log("Before calling get chain state");
    //console.log("current chain state", await proofManagerClient.getChainState(`0x${app_id_2}`, paymentBlockNumber));
    console.log("Trying to update nexus block: ", accountDetails.response.nexus_header.number);
    await proofManagerClient.updateNexusBlock(
      accountDetails.response.nexus_header.number,
      `0x${accountDetails.response.nexus_header.state_root}`,
      //TODO: To be replaced by hash of nexus header.
      `0x${accountDetails.response.nexus_header.avail_header_hash}`,
      //TODO: To be replaced with actual proof depending on prover mode.
      ""
    );
    console.log("Updated nexus block next is proof", "\n", accountDetails.response.nexus_header.state_root, "\n", accountDetails.response.proof, accountDetails.response);
    await sleep(2000);
    const proofTx = await proofManagerClient.updateChainState(
      accountDetails.response.nexus_header.number,
      accountDetails.response.proof,
      app_id_2,
      accountDetails.response.account
    )

    console.log("Updated chain state", (await proofTx.wait()).logs);

    const zksyncAdapter = new ZKSyncVerifier({
      [app_id]: {
        rpcUrl: zksync_nft_url,
        mailboxContract: "0xb1912E6F8F334E91Cf1Fd5ef1Cd0d79752059f19",
        stateManagerContract: stateManagerNFTChainAddr,
        appID: app_id,
        chainId: "270",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync
      },
      [app_id_2]: {
        rpcUrl: zksync_payment_url,
        mailboxContract: "0x2bF372cAeb2B33e1F444aDF4704427BC49DD6046",
        stateManagerContract: "0x1ca8830B35ca8312496Ed23b475d0af5d0515ea8",
        appID: app_id,
        chainId: "271",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync2
      }
    }, {
      rpcUrl: zksync_nft_url,
      mailboxContract: "0xb1912E6F8F334E91Cf1Fd5ef1Cd0d79752059f19",
      stateManagerContract: stateManagerNFTChainAddr,
      appID: app_id,
      chainId: "270",
      type: Networks.ZKSync,
      privateKey: privateKeyZkSync
    }, mailboxAbi.abi)

    const paymentReceipt: PaymentReceipt = {
      from: await signerPayment.getAddress(),
      to: await signerPayment.getAddress(),
      nftId: tokenId.toString(),
      amount: ethers.parseEther("1").toString(),
      tokenAddress: paymentTokenAddr,
    }

    let abiCoder = new AbiCoder();

    const expectedMessage: MailboxMessage = {
      nexusAppIDFrom: app_id_2,
      nexusAppIDTo: [app_id],
      from: await paymentContract.getAddress(),
      data: abiCoder.encode(["address", "address", "uint256", "uint256", "address"], [
        paymentReceipt.from,
        paymentReceipt.to,
        paymentReceipt.nftId,
        paymentReceipt.amount,
        paymentReceipt.tokenAddress,
      ]),
      to: [nftContractAddress],
      nonce: lockNFTResult.nonce.toString(),
    };

    const encodedReceipt = abiCoder.encode(
      [
        "bytes32",
        "bytes32[]",
        "bytes",
        "address",
        "address[]",
        "uint256"],
      [
        expectedMessage.nexusAppIDFrom,
        expectedMessage.nexusAppIDTo,
        expectedMessage.data,
        expectedMessage.from,
        expectedMessage.to,
        expectedMessage.nonce,
      ],

    )

    const receiptHash = keccak256(encodedReceipt);

    const receipt = await zksyncAdapter.receiveMessage(
      accountDetails.response.account.height,
      expectedMessage,
      {
        storageKey: zksyncAdapter.calculateStorageKey(receiptHash, 0)
      }
    )

    console.log(receipt);
    // Event signature for Confirmation event
    const confirmationEventTopic = ethers.id("Confirmation(uint256,address)");

    // Loop through logs to check if the Confirmation event is emitted
    const confirmationLogs = receipt.logs.filter(log => log.topics[0] === confirmationEventTopic);

    if (confirmationLogs.length > 0) {
      console.log("Confirmation event was emitted.");
    } else {
      console.log(receipt.logs);
      console.log("No Confirmation event in this transaction.");
    }
  }

  // async function scenario2() {
  //   // 5. Lock nft on one chain
  //   // 6. Withdraw nft using exclusion proof after timeout
  //   let lockHash = await lockNFT();
  //   await fetchUpdatesFromNexus();
  //   await withdrawNFT(lockHash[1]);
  // }



  async function lockNFT(): Promise<{
    txHeight: number,
    nonce: bigint
  }> {
    console.log("Inside lock NFT");
    const nextNonce = BigInt(await paymentContract.getCurrentNonce(await signerPayment.getAddress())) + BigInt(1);
    const tx = await nftContract.lockNFT(
      tokenId,
      ethers.parseEther("1"),
      nextNonce,
      await paymentToken.getAddress(),
      await signerNFT.getAddress(),
      await signerPayment.getAddress(),
      await signerPayment.getAddress(),
    );
    console.log("Sent tx \n");

    // Wait for the transaction to be mined
    const receipt: TransactionReceipt = await tx.wait();

    return { txHeight: receipt.blockNumber, nonce: nextNonce }
  }

  async function payForNFT(): Promise<number> {
    console.log("Trying to mint");

    // Check the balance of the signerPayment
    const signerPaymentAddress = await signerPayment.getAddress();
    const balance = await paymentToken.balanceOf(signerPaymentAddress);
    console.log("Signer Balance:", ethers.formatEther(balance));

    // Ensure the signer has enough balance for the payment
    const amountToPay = ethers.parseEther(amount);
    if (balance < amountToPay) {
      throw new Error("Insufficient balance to pay for NFT");
    }

    // Approve the paymentContract to spend the amount on behalf of the user
    console.log("Approving token for payment contract...");
    const approveTx = await paymentToken.approve(await paymentContract.getAddress(), amountToPay);

    // Wait for the approval transaction to be mined
    await approveTx.wait();
    console.log("Token approved for payment contract.");

    // Now proceed with the payment
    console.log("Paying amount now", await paymentToken.getAddress(), await signerNFT.getAddress(), await paymentToken.balanceOf(signerPaymentAddress));

    // The below sends message to mailbox
    const tx = await paymentContract.pay(
      await paymentToken.getAddress(),
      amountToPay, // Use the approved amount
      tokenId,
      await signerNFT.getAddress()
    );

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Payment done");

    for (const log of receipt.logs) {
      try {
        const abi = [
          "event MailboxEvent(bytes32 indexed nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address indexed from, address[] to, uint256 nonce)"
        ];
        const eventInterface = new ethers.Interface(abi);
        const decodedLog = eventInterface.decodeEventLog("MailboxEvent", log.data, log.topics);

        console.log("Decoded Event:");
        console.log("nexusAppIDFrom:", decodedLog.nexusAppIDFrom);
        console.log("nexusAppIDTo:", decodedLog.nexusAppIDTo);
        console.log("Data:", decodedLog.data);
        console.log("From:", decodedLog.from);
        console.log("To:", decodedLog.to);
        console.log("Nonce:", decodedLog.nonce);
      } catch (err) {
        console.log("Could not decode", log.topics);
        continue;
      }
    }



    return receipt.blockNumber;
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
}

main().then(() => {
  process.exit(0);
})

function sleep(val?: number) {
  const duration = val !== undefined ? val : 30 * 1000;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function waitForUpdateOnNexus(nexusClient: NexusClient, blockHeight: number): Promise<AccountApiResponse> {
  //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
  await sleep(60000);
  const response: AccountApiResponse = await nexusClient.getAccountState();

  if (response.response.account.height == 0) {
    throw new Error("Account not yet initiated");
  }
  return response;


  // for (let i = 0; i <= 20; i++) {
  //   const response: AccountApiResponse = await nexusClient.getAccountState();

  //   if (response.response.account.height >= blockHeight) {
  //     return response;
  //   }

  //   console.log("Required zksync block not yet updated on nexus.");

  //   await sleep(1000);
  // }
}


