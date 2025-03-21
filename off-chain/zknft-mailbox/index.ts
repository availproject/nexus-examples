import { ethers, Log, TransactionReceipt, Provider, keccak256, lock } from "ethers";
import { Provider as L2Provider, types } from "zksync-ethers";
import erc20Abi from "./abi/MyERC20Token.json" with { type: "json" };
import nexusStateManagerAbi from "./abi/nexusStateManager.json" with { type: "json" };
import axios from "axios";
import paymentAbi from "./abi/NFTPaymentMailbox.json" with { type: "json" };
  import nftAbi from "./abi/MyNFTMailbox.json" with { type: "json" };
import mailboxAbi from "./abi/nexus_mailbox.json"  with { type: "json" };
import storageProofAbi from "./abi/StorageProof.json" with { type: "json" };
import verifierWrapperAbi from "./abi/VerifierWrapper.json"  with { type: "json" };
import zksyncNexusManagerAbi from "./abi/ZKSyncNexusManagerRouter.json"  with { type: "json" };
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

let nexusRPCUrl = "https://dev.nexus.avail.tools";
let zksync_nft_url = "https://zksync1.nexus.avail.tools";
let zksync_payment_url = "https://zksync2.nexus.avail.tools";
let privateKeyZkSync = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let privateKeyZkSync2 = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let stateManagerNFTChainAddr = deployedAddresses.proofManagerAddress1;
let paymentContractAddress = deployedAddresses.nftPaymentContractAddress;
let paymentTokenAddr = deployedAddresses.tokenContractAddress;
let nftContractAddress = deployedAddresses.nftContractAddress;
let tokenId = 133;
let app_id =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
let app_id_2 =
  "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";

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

  // console.log(await nftContract.ownerOf(tokenId));
  // console.log(await nftContract.ownerOf(tokenId + 1));


  // this shouldn't be hardcoded, rather should be managed by sc. Doing it here since need time to write code
  // to get nft id from events if done via sc.
  await nftContract.mint(tokenId);
  console.log("✅ minted NFT with token ID", tokenId);
  await sleep(1000);
  await nftContract.mint(tokenId + 1);
  console.log("✅ minted NFT with token ID", tokenId + 1);

  // for (let i = tokenId; i < 50; i++) {
  //   nftContract.mint(i);
  //   await sleep(1000);
  //   console.log("✅ minted NFT with token ID", i);
  // }

  await sleep(5000);

  await scenario1();
  // await scenario2();

  async function scenario1() {
    // 3. Lock nft on one chain and pay on another chain
    // 4. Receive on NFT using inclusiong proof.
    console.log(" ⌛ Lock nft on one chain and pay on another chain. Receive on NFT using inclusiong proof.")
    const lockNFTResult = await lockNFT();
    console.log("💯 Lock NFT Result", lockNFTResult)

    const [paymentBlockNumber, emmittedReceiptHash] = await payForNFT();

    const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(paymentNexusClient, paymentBlockNumber);
    await proofManagerClient.updateNexusBlock(
      accountDetails.response.nexus_header.number,
      `0x${accountDetails.response.nexus_header.state_root}`,
      //TODO: To be replaced by hash of nexus header.
      `0x${accountDetails.response.nexus_header.avail_header_hash}`,
      //TODO: To be replaced with actual proof depending on prover mode.
      ""
    );
    console.log("✅  Updated Nexus Block");
    await sleep(2000);
    await proofManagerClient.updateChainState(
      accountDetails.response.nexus_header.number,
      accountDetails.response.proof,
      app_id_2,
      accountDetails.response.account
    )

    console.log("✅  Updated Chain State");

    const zksyncAdapter = new ZKSyncVerifier({
      [app_id]: {
        rpcUrl: zksync_nft_url,
        mailboxContract: deployedAddresses.mailBoxAddress1,
        stateManagerContract: stateManagerNFTChainAddr,
        appID: app_id,
        chainId: "271",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync
      },
      [app_id_2]: {
        rpcUrl: zksync_payment_url,
        mailboxContract: deployedAddresses.mailBoxAddress2,
        stateManagerContract: deployedAddresses.proofManagerAddress2,
        appID: app_id_2,
        chainId: "272",
        type: Networks.ZKSync,
        privateKey: privateKeyZkSync2
      }
    }, app_id)

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

    console.log("expected message", expectedMessage);

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
      console.log("Calculated receipt hash", receiptHash, "emmittedReceiptHash", emmittedReceiptHash);
      throw new Error("Calculated receipt hash is incorrect");
    }

    const mailboxContract = new ethers.Contract(deployedAddresses.mailBoxAddress2, mailboxAbi.abi, providerPayment);
    const mapping = await mailboxContract.messages(emmittedReceiptHash);
    console.log("✅  Mapping exists", mapping);

    const storageSlot: bigint = await paymentContract.getStorageLocationForReceipt(receiptHash);

    const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height,
      expectedMessage,
      {
        storageKey: storageSlot.toString()
      });

    console.log("Proof", proof);

    const errorDecoder = ErrorDecoder.create([nftAbi, mailboxAbi.abi, storageProofAbi.abi, verifierWrapperAbi.abi, mailboxAbi.abi, zksyncNexusManagerAbi.abi])
    let receipt: TransactionReceipt | null = null;
    try {

      const transferTx = await nftContract.transferNFT(
        accountDetails.response.account.height,
        expectedMessage,
        zksyncAdapter.encodeMessageProof(proof),
      )

      receipt = await transferTx.wait();
      console.log("✅  NFT Transfer successful", receipt?.logs)

      // Decode events
      for (const log of receipt?.logs || []) {

        try {
          // Try decoding Confirmation event
          const confirmationAbi = [
            "event Confirmation(uint256 tokenId, address receiver)"
          ];
          const confirmationInterface = new ethers.Interface(confirmationAbi);
          const decodedConfirmation = confirmationInterface.decodeEventLog("Confirmation", log.data, log.topics);
          console.log("Confirmation Event:", {
            tokenId: decodedConfirmation.tokenId,
            receiver: decodedConfirmation.receiver
          });
        } catch (err) {
          try {
            // Try decoding Transfer event
            const transferAbi = [
              "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
            ];
            const transferInterface = new ethers.Interface(transferAbi);
            const decodedTransfer = transferInterface.decodeEventLog("Transfer", log.data, log.topics);
            console.log("Transfer Event:", {
              from: decodedTransfer.from,
              to: decodedTransfer.to,
              tokenId: decodedTransfer.tokenId
            });
          } catch (err) {
            // Not a Transfer event
            continue;
          }
        }
      }
    } catch (err) {
      console.log(err)
      const { reason } = await errorDecoder.decode(err)
      console.log('Revert reason:', reason)
    }
  }

  async function scenario2() {
    // 5. Lock nft on one chain
    // 6. Withdraw nft using exclusion proof after timeout

    console.log("⌛  Lock nft on one chain. Withdraw nft using exclusion proof after timeout")
    tokenId += 1;

    let lockNFTResult = await lockNFT();

    const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(paymentNexusClient, 0);

    console.log("⏳ Waiting for 2 blocks... ");
    sleep(2000);

    const paymentReceipt: PaymentReceipt = {
      from: await signerPayment.getAddress(),
      to: await signerPayment.getAddress(),
      nftId: tokenId.toString(),
      amount: ethers.parseEther("1").toString(),
      tokenAddress: paymentTokenAddr,
    }


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
    }, 
      app_id)


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

    const storageSlot: bigint = await paymentContract.getStorageLocationForReceipt(receiptHash);

    const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height,
      expectedMessage,
      {
        storageKey: storageSlot.toString()
      });

    const errorDecoder = ErrorDecoder.create([nftAbi, mailboxAbi.abi, storageProofAbi.abi, verifierWrapperAbi.abi, mailboxAbi.abi, zksyncNexusManagerAbi.abi])
    let receipt: TransactionReceipt | null = null;
    try {
      const withdrawTx = await nftContract.withdrawNFT(
        tokenId,
        zksyncAdapter.encodeMessageProof(proof),
      )

      receipt = await withdrawTx.wait();
      console.log("✅   NFT Withdrawal successfull")
    } catch (err) {
      console.log(err)
      const { reason } = await errorDecoder.decode(err)
      console.log('Revert reason:', reason)
    }

  }



  async function lockNFT(): Promise<{
    txHeight: number,
    nonce: bigint
  }> {

    console.log(" Locking NFT id", tokenId);
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

        console.log("emitted event", decodedLog);
        receiptHash = decodedLog.receiptHash;
        break;
      } catch (err) {
        continue;
      }
    }

    return [receipt.blockNumber, receiptHash];
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
}