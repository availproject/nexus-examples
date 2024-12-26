import {
  ethers,
  Log,
  TransactionReceipt,
  Provider,
  keccak256,
  lock,
} from "ethers";
import { Provider as L2Provider,  types } from "zksync-ethers";

import {
  NexusClient,
  MailBoxClient,
  ProofManagerClient,
  ZKSyncVerifier,
} from "nexus-js";
import { AccountApiResponse } from "nexus-js";
import { Networks } from "nexus-js";
import { MailboxMessageStruct } from "nexus-js";

import { AbiCoder } from "ethers";
import { ParamType } from "ethers";
import { ErrorDecoder } from "ethers-decode-error";

import BridgeABI from "./abi/bridge.json" with { type: "json" };
import ERC20Abi from "./abi/MyERC20Token.json" with { type: "json" };
import mailboxAbi from "./abi/mailbox.json" with { type: "json" };
import { sleep } from "zksync-ethers/build/utils.js";

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

// ZKSYNC 1
// NexusProofManager deployed to:  0x6f96e1f78Ce4dC1cF742bA14A9eE8fE0f4A538A2
// 0x8ff97419363ffd7000167f130ef7168fbea05faf9251824ca5043f113cc6a7c7
// Mailbox deployed to:  0x08121657687264afDe690a2f5D833fDeD0C270Ce
// Verifer deployed to :  0xB308CA4eCA3d77cdCdD0886bd35859d9F10Cc202

// ZKSYNC 2
// NexusProofManager deployed to:  0x6838b31404d6A00B24097B9eD97b1f4739f8a4A8
// Mailbox deployed to:  0xd0b12bacba3D73A0e4a959Ff469FcEc6C5eB24A7
// Verifer deployed to :  0xc84c82A60121Dc14C81D04e969B0eD9554232F98

const NexusBridgeZKSYNC1 = "0x1abB25bf5403178A31753c416B29c3b94D715b0C";
const ERC20TokenZKSYNC1 = "0xB736FaB431d420824Ef64b17325932169A5FF099";
const NexusBridgeZKSYNC2 = "0xb915aC078613c7996c205aC0937c2b703ca8FB91";
const ERC20TokenZKSYNC2 = "0xebD2C81De496A601F48ff84E2D5ae5a718Baf41E";
const mailboxAddressZKSYNC1 = "0x08121657687264afDe690a2f5D833fDeD0C270Ce"
const mailboxAddressZKSYNC2 = "0xfcC66069D2046dF3cA36Ae56B3E64eC5CDd48eD4"
const proofManagerAddressZKSYNC2 = "0x6838b31404d6A00B24097B9eD97b1f4739f8a4A8"
const proofManagerAddressZKSYNC1 = "0x6f96e1f78Ce4dC1cF742bA14A9eE8fE0f4A538A2"
const privateKey =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
const zksync1URL = "http://zksync1.nexus.avail.tools";
const zksync2URL = "http://zksync2.nexus.avail.tools";
const nexusRPCUrl = "http://dev.nexus.avail.tools";
const nonce = 3;
const appId1 = "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
const appId2 = "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";
async function main() {
  // 1. Lock money on one chain. Send message to mailbox
  // 2. Unlock money on another chain.
  const zksync1Provider = new L2Provider(zksync1URL);
  const zksync2Provider = new L2Provider(zksync2URL);
  const signerZKSYNC1 = new ethers.Wallet(
    privateKey,
    zksync1Provider as unknown as Provider
  );
  const signerZKSYNC2 = new ethers.Wallet(
    privateKey,
    zksync2Provider as unknown as Provider
  );
  const bridgeContractZKSYNC1 = new ethers.Contract(
    NexusBridgeZKSYNC1,
    BridgeABI.abi,
    signerZKSYNC1
  );
  const bridgeContractZKSYNC2 = new ethers.Contract(
    NexusBridgeZKSYNC2,
    BridgeABI.abi,
    signerZKSYNC2
  );

  const erc20TokenZKSYNC1Contract = new ethers.Contract(
    ERC20TokenZKSYNC1,
    ERC20Abi,
    signerZKSYNC1
  );

  const lockAmount = ethers.parseEther("1");
  // Lock ETH
  await erc20TokenZKSYNC1Contract.mint(
    signerZKSYNC1.address,
    ethers.parseEther("10")
  );
  await erc20TokenZKSYNC1Contract.approve(bridgeContractZKSYNC1, lockAmount);

  const assetId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
  await bridgeContractZKSYNC1.updateNexusTokens(
    [assetId],
    [await erc20TokenZKSYNC1Contract.getAddress()]
  );
  console.log("Sending ERC20");
  let receiptHash: string = "0x";
  let blockNumber: number = 0;
  try {
    const balance = await erc20TokenZKSYNC1Contract.balanceOf(signerZKSYNC1.address);
    
    const tx = await bridgeContractZKSYNC1.sendERC20(
      assetId,
      ethers.zeroPadValue(ethers.toBeHex(signerZKSYNC1.address), 32), 
      lockAmount,
      [appId2],
      nonce,
      [mailboxAddressZKSYNC2]
    );
    const receipt = await tx.wait();
    blockNumber = receipt.blockNumber;
  
    const abi = [
      "event MailboxEvent(bytes32 indexed nexusAppIDFrom,bytes32[] nexusAppIDTo,bytes data,address indexed from,address[] to,uint256 nonce,bytes32 receiptHash)"
  ];
    const eventInterface = new ethers.Interface(abi);
  
    for (const log of receipt.logs) {
      try {
        const decodedLog = eventInterface.decodeEventLog("MailboxEvent", log.data, log.topics);
        receiptHash = decodedLog.receiptHash;
        break;
      } catch (err) {
      
        continue;
      }
    }
      console.log("Successfully sent ERC20 tokens");
  } catch (error) {
    console.error("Error sending ERC20 tokens:", error);
    throw error;
  }

  // 2. Fetch storage proof from zksync1
  const proofManagerClient = new ProofManagerClient(proofManagerAddressZKSYNC2, zksync2URL, privateKey);
  const zksync1NexusClient = new NexusClient(nexusRPCUrl, appId1);
  const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(zksync1NexusClient, blockNumber);
  console.log("Account details:", accountDetails);
  await proofManagerClient.updateNexusBlock(
    accountDetails.response.nexus_header.number,
    `0x${accountDetails.response.nexus_header.state_root}`,
    //TODO: To be replaced by hash of nexus header.
    `0x${accountDetails.response.nexus_header.avail_header_hash}`,
    //TODO: To be replaced with actual proof depending on prover mode.
    ""
  );
  console.log("Updated Nexus Block");
  await sleep(2000);
  await proofManagerClient.updateChainState(
    accountDetails.response.nexus_header.number,
    accountDetails.response.proof,
    appId1,
    accountDetails.response.account
  )

  console.log("✅  Updated Chain State");
  
  const zksyncAdapter = new ZKSyncVerifier({
    [appId1]: {
      rpcUrl: zksync1URL,
      mailboxContract: mailboxAddressZKSYNC1,
      stateManagerContract: proofManagerAddressZKSYNC1,
      appID: appId1,
      chainId: "270",
      type: Networks.ZKSync,
      privateKey
    },
    [appId2]: {
      rpcUrl: zksync2URL,
      mailboxContract: mailboxAddressZKSYNC2,
      stateManagerContract: proofManagerAddressZKSYNC2,
      appID: appId2,
      chainId: "271",
      type: Networks.ZKSync,
      privateKey
    }
  }, {
    rpcUrl: zksync2URL,
    mailboxContract: mailboxAddressZKSYNC2,
    stateManagerContract: proofManagerAddressZKSYNC2,
    appID: appId2,
    chainId: "271",
    type: Networks.ZKSync,
    privateKey
  }, mailboxAbi.abi)



  const mailboxContract = new ethers.Contract(mailboxAddressZKSYNC1, mailboxAbi.abi, signerZKSYNC1);
  const mapping = await mailboxContract.messages(receiptHash);
  console.log("✅  Mapping exists", mapping);

  // const storageSlot: bigint = await paymentContract.getStorageLocationForReceipt(receiptHash);

  // const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height,
  //   mapping,
  //   {
  //     storageKey: storageSlot.toString()
  //   });

  // const errorDecoder = ErrorDecoder.create([BridgeABI.abi, mailboxAbi.abi, storageProofAbi.abi, verifierWrapperAbi.abi, mailboxAbi.abi, zksyncNexusManagerAbi.abi])
  // let receipt: TransactionReceipt | null = null;
  // try {

  //   const transferTx = await nftContract.transferNFT(
  //     accountDetails.response.account.height,
  //     expectedMessage,
  //     zksyncAdapter.encodeMessageProof(proof),
  //   )

  //   receipt = await transferTx.wait();
  //   console.log("✅  NFT Transfer successfull")
  // } catch (err) {
  //   console.log(err)
  //   const { reason } = await errorDecoder.decode(err)
  //   console.log('Revert reason:', reason)
  // }

}

main();



async function waitForUpdateOnNexus(nexusClient: NexusClient, blockHeight: number): Promise<AccountApiResponse> {
  //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
  await sleep(60000);
  const response: AccountApiResponse = await nexusClient.getAccountState();

  if (response.response.account.height == 0) {
    throw new Error("Account not yet initiated");
  }
  return response;
}
