import { ethers, Log, TransactionReceipt, Provider, keccak256 } from "ethers";
import { Provider as L2Provider, types } from "zksync-ethers";
import nexusMailboxAbi from "./nexus_mailbox.json" with { type: "json" };
import erc20Abi from "./abi/MyERC20Token.json" with { type: "json" };
import nexusStateManagerAbi from "./nexusStateManager.json" with { type: "json" };
import axios from "axios";
import paymentAbi from "./abi/NFTPaymentMailbox.json" with { type: "json" };
import nftAbi from "./abi/MyNFTMailbox.json" with { type: "json" };
import mailboxAbi from "./nexus_mailbox.json"  with { type: "json" };
import storageProofAbi from "./StorageProof.json" with { type: "json" };
import verifierWrapperAbi from "./VerifierWrapper.json"  with { type: "json" };
import zksyncNexusManagerAbi from "./ZKSyncNexusManagerRouter.json"  with { type: "json" };
import { NexusClient, MailBoxClient, ProofManagerClient, ZKSyncVerifier } from "nexus-js";
import { AccountApiResponse } from "nexus-js";
import { Networks } from "nexus-js";
import { MailboxMessageStruct } from "nexus-js";
import { AbiCoder } from "ethers";
import { ParamType } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";
import deployedAddresses from "./deployed_addresses.json" with { type: "json" };

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
let zksync_nft_url = "http://127.0.0.1:3150";
let zksync_payment_url = "http://127.0.0.1:3050";
let privateKeyZkSync = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let privateKeyZkSync2 = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let stateManagerNFTChainAddr = deployedAddresses.proofManagerAddress1;
let paymentContractAddress = deployedAddresses.nftPaymentContractAddress;
let paymentTokenAddr = deployedAddresses.tokenContractAddress;
let nftContractAddress = deployedAddresses.nftContractAddress;
let tokenId = 21;
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
    app_id_2
  );
  const paymentNexusClient = new NexusClient(
    nexusRPCUrl,
    app_id
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

  // const nexusMailboxContract = new ethers.Contract(
  //   "0x19b80d3A8fd2685902dF07499F6f82Abed9F2Ee9",
  //   mailboxAbi.abi,
  //   providerNFT,
  // )

  // console.log("mapping: ", await nexusMailboxContract.verifierWrappers(app_id_2))

  // return;

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
  const proofManagerClient = new ProofManagerClient(stateManagerNFTChainAddr, zksync_nft_url, privateKeyZkSync);
  const tx = await nftContract.setNftPaymentContractAddress(paymentContractAddress);
  const receipt = await tx.wait();

  // this shouldn't be hardcoded, rather should be managed by sc. Doing it here since need time to write code
  // to get nft id from events if done via sc.
  await nftContract.mint(tokenId);
  console.log("✅ minted NFT with token ID", tokenId);
  await sleep(5000);

  // const txToSend = {
  //   to: '0x2bF372cAeb2B33e1F444aDF4704427BC49DD6046',
  //   from: '0x618263CE921F7dd5F4f40C29f6c524Aaf97b9bbd',
  //   data: '0x151086c3000000000000000000000000000000000000000000000000000000000000002d000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002601f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000bd8597e7cd50e16de71a8402aab52b67717b486e00000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000013655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000618263ce921f7dd5f4f40c29f6c524aaf97b9bbd000000000000000000000000618263ce921f7dd5f4f40c29f6c524aaf97b9bbd00000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000053f7d36ba59d0366a94b89d283d276ab893effc00000000000000000000000000000000000000000000000000000000000000010000000000000000000000001d48fc61b008a55ea438696e9280f0fca1cc60b80000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000002d0000000000000000000000002bf372caeb2b33e1f444adf4704427bc49dd6046000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cf633ca048c311b684c2cb47f1e24f3a155837ceb7816d7bd9341023a711c8870ff45a9fabe35db2acae6ff390b83dbdc949c1ce843ca61d66973508cba256ce2d5dc8d09cee20062c3921165631c74746a82cc7c41b13384bb102a9f3e8728528f18cdc17d03fe5d40e9f3da26bc8b6f90fadb4dd4ad65b0907547a766ffa8095d634808b992eb7e21431c5ecade9cabf1e6b7e12f65f5bcec0260798a74ffa693a85f42effd40466414f1eea39bb43da63c3a5959155a5f7127fa13b811d9ff3f4bb1396af5f3b98f4ed66cf5a6ce14f16d7b18239e76dd5b5559ca0c523752bc0ce59957db381d8144d7b19137e75d140a4592942a512cb85adf6a880e76cbc8abdaeab8222c194e9a7843561ad6ab7c2b2e38687590bc9f965c19c82a6fe853e96f44931cba77b5250d552f8044384ae19a88f75d80efd8963508d3f06dd68a96688502f9958c4e1deed47ce4ea140fed5c5746ac6722af4eebec7d9a2149a9649851329fa051bdcbd09900ac7106f97c3cf40acf44e8c42368e4f89336b1',
  //   gasLimit: 1000000, // Set an appropriate gas limit
  //   value: ethers.parseEther("0.0"), // if you want to send Ether, specify value here
  // };


  // await sendTransaction();

  // Send the transaction
  // async function sendTransaction() {
  //   try {
  //     const response = await signerNFT.sendTransaction(txToSend);
  //     console.log('Transaction hash:', response.hash);
  //     // Wait for the transaction to be mined
  //     console.log('Transaction confirmed', await response.wait());
  //   } catch (error) {
  //     console.error('Error sending transaction:', error);
  //   }
  // }

  await scenario1();

  async function scenario1() {
    // 3. Lock nft on one chain and pay on another chain
    // 4. Receive on NFT using inclusiong proof.
    const lockNFTResult = await lockNFT();
    console.log("Lock NFT Result", lockNFTResult)

    const [paymentBlockNumber, emmittedReceiptHash] = await payForNFT();
    console.log("Payment Result", paymentBlockNumber, emmittedReceiptHash);


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
    await proofManagerClient.updateChainState(
      accountDetails.response.nexus_header.number,
      accountDetails.response.proof,
      app_id,
      accountDetails.response.account
    )

    console.log("Updated chain state",  accountDetails.response.nexus_header.number,
      accountDetails.response.proof,
      app_id,
      accountDetails.response.account);

    const zksyncAdapter = new ZKSyncVerifier({
      [app_id]: {
        rpcUrl: zksync_nft_url,
        mailboxContract: deployedAddresses.mailBoxAddress1,
        stateManagerContract: stateManagerNFTChainAddr,
        appID: app_id,
        chainId: "270",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync
      },
      [app_id_2]: {
        rpcUrl: zksync_payment_url,
        mailboxContract: deployedAddresses.mailBoxAddress2,
        stateManagerContract: deployedAddresses.proofManagerAddress2,
        appID: app_id,
        chainId: "271",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync2
      }
    }, {
      rpcUrl: zksync_nft_url,
      mailboxContract: deployedAddresses.mailBoxAddress1,
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
      data: abiCoder.encode(["address", "address", "uint256", "uint256", "address"], [
        paymentReceipt.from,
        paymentReceipt.to,
        paymentReceipt.nftId,
        paymentReceipt.amount,
        paymentReceipt.tokenAddress,
      ]),
      from: paymentContractAddress,
      to: [nftContractAddress],
      nonce: lockNFTResult.nonce.toString(),
    };

    const encodedReceipt = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(bytes32 nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address from, address[] to, uint256 nonce)"],
      [{
          nexusAppIDFrom: expectedMessage.nexusAppIDFrom,
          nexusAppIDTo: expectedMessage.nexusAppIDTo,
          data: expectedMessage.data,
          from: expectedMessage.from,
          to: expectedMessage.to,
          nonce: expectedMessage.nonce
      }]
  );


    const receiptHash = keccak256(encodedReceipt);
   
    if (receiptHash !== emmittedReceiptHash) {
      throw new Error("Calculated receipt hash is incorrect");
    }

    const mailboxContract = new ethers.Contract(deployedAddresses.mailBoxAddress2, mailboxAbi.abi, providerPayment);

    const mapping = await mailboxContract.messages(emmittedReceiptHash);

    console.log("Mapping exists", mapping);

    const storageSlot: bigint = await paymentContract.getStorageLocationForReceipt(receiptHash);

    const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height,
      expectedMessage,
      {
        storageKey: storageSlot.toString()
      });

    console.log("proof details: ", proof, "\n");

    const errorDecoder = ErrorDecoder.create([nftAbi, mailboxAbi.abi, storageProofAbi.abi, verifierWrapperAbi.abi, nexusMailboxAbi.abi, zksyncNexusManagerAbi.abi])
    let receipt: TransactionReceipt | null = null;
    try {
      console.log("Storage proof encoding: ", zksyncAdapter.encodeMessageProof(proof))
      const transferTx = await nftContract.transferNFT(
        accountDetails.response.account.height,
        expectedMessage,
        zksyncAdapter.encodeMessageProof(proof),
      )

      receipt = await transferTx.wait();
      console.log("NFT Transfer successfull", receipt)
    } catch (err) {
      console.log(err)
      const { reason } = await errorDecoder.decode(err)
      // Prints "ERC20: transfer to the zero address"
      console.log('Revert reason:', reason)
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

  async function payForNFT(): Promise<[number, string]> {
    console.log("Trying to mint");

    // Check the balance of the signerPayment
    const signerPaymentAddress = await signerPayment.getAddress();
    const balance = await paymentToken.balanceOf(signerPaymentAddress);
    console.log("Signer Balance:", ethers.formatEther(balance));

    // Ensure the signer has enough balance for the payment
    const amountToPay = ethers.parseEther("1");
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

    let receiptHash: string = "0x";
    for (const log of receipt.logs) {
      try {
        const abi = [
          "event MailboxEvent(bytes32 indexed nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address indexed from, address[] to, uint256 nonce, bytes32 receiptHash)"
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
        console.log("Receipt hash:", decodedLog.receiptHash);

        receiptHash = decodedLog.receiptHash;
        break;
      } catch (err) {
        continue;
      }
    }

    return [receipt.blockNumber, receiptHash];
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


