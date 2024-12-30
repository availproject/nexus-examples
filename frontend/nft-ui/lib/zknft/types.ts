import * as scale from "subshape";
import { Shape } from "subshape";

export type NFT = {
  id: number,
  owner: string,
  metadata: NftMetadata,
  price: number,
  alt: string,
};

export type NftMetadata = {
  name: string,
  url: string,
  description: string,
};

export type Menu = {
  title: string;
  path: string;
};

export enum MenuType {
  "main",
  "footer"
}

// export interface Mint {
//   id: H256;
//   from: H256;
//   to: H256;
//   data: string | undefined;
//   future_commitment: H256 | undefined;
//   metadata: NftMetadata;
// }

// export interface Burn {
//   id: H256;
//   from: H256;
//   data: string | undefined;
//   future_commitment: H256 | undefined;
// }

// export interface Trigger {
//   id: H256;
//   from: H256;
//   data?: string | null;
//   merkleProof: MerkleProof;
//   receipt: TransactionReceipt;
// }

// export interface Transfer {
//   id: H256;
//   from: H256;
//   to: H256;
//   data: string | undefined;
//   future_commitment: H256 | undefined;
// }

// export type MergeValue = { readonly Value: H256 } |
// {
//   readonly MergeWithZero: {
//     base_node: H256,
//     zero_bits: H256,
//     zero_count: number,
//   }
// } |
// {
//   readonly ShortCut: {
//     key: H256,
//     value: H256,
//     height: number,
//   }
// }

// export interface TransactionReceipt {

// }

export interface BuyNftQuery {
  nft_id: string,
  payment_sender: string,
  nft_receiver: string,
}

// export interface MerkleProof {
//   // leaf bitmap, bitmap.get_bit(height) is true means there need a non zero sibling in this height
//   leaves_bitmap: H256[],
//   // needed sibling node hash
//   merkle_path: MergeValue[],
// }

// export interface TransferEnum extends Transfer {
//   NftTransactionMessage: "Transfer",
// }

// export interface MintEnum extends Mint {
//   NftTransactionMessage: "Mint",
// }

// export interface BurnEnum extends Burn {
//   NftTransactionMessage: "Burn",
// }


// export type NftTransactionMessage = TransferEnum | MintEnum | BurnEnum;

// export interface NftTransaction {
//   message: number[],
//   signature: H512,
// }

// export const $nft_metadata: Shape<NftMetadata> = scale.object(
//   scale.field("name", scale.str),
//   scale.field("url", scale.str),
//   scale.field('description', scale.str)
// )

// export const $mint: Shape<Mint> = scale.object(
//   scale.field("id", $address),
//   scale.field("from", $address),
//   scale.field("to", $address),
//   scale.field("data", scale.option(scale.str)),
//   scale.field("future_commitment", scale.option($address)),
//   scale.field("metadata", $nft_metadata),
// )

// export const $transfer: Shape<Transfer> = scale.object(
//   scale.field("id", $address),
//   scale.field("from", $address),
//   scale.field("to", $address),
//   scale.field("data", scale.option(scale.str)),
//   scale.field("future_commitment", scale.option($address)),
// )

// export const $burn: Shape<Burn> = scale.object(
//   scale.field("id", $address),
//   scale.field("from", $address),
//   scale.field("data", scale.option(scale.str)),
//   scale.field("future_commitment", scale.option($address)),
// )

// export const $transactionMessage: Shape<NftTransactionMessage> = scale.taggedUnion(
//   "NftTransactionMessage", [
//   scale.variant("Transfer", $transfer),
//   scale.variant("Mint", $mint),
//   scale.variant("Burn", $burn)
// ]);

// export const $buyNft: Shape<BuyNftQuery> = scale.object(
//   scale.field("nft_id", scale.sizedArray(scale.u8, 32)),
//   scale.field("payment_sender", scale.sizedArray(scale.u8, 32)),
//   scale.field("payment_expected_nonce", scale.u64),
//   scale.field("nft_receiver", scale.sizedArray(scale.u8, 32)),
// )


//Payment types 

export enum TransferStatus {
  NotInitiated = 0,
  WaitingForLock = 1,
  WaitingForPayment = 2,
  PaymentDone = 3,
  TransferInProgress = 4,
  NFTTransferred = 5,
}

export interface CheckPaymentReply {
  id: string,
  status: TransferStatus,
}

/** Processed batch */
export interface StoredBatchInfo {
  batchNumber: bigint;
  batchHash: string;
  indexRepeatedStorageChanges: bigint;
  numberOfLayer1Txs: bigint;
  priorityOperationsHash: string;
  l2LogsTreeRoot: string;
  timestamp: bigint;
  commitment: string;
}

/** Metadata of the batch passed to the contract */
export type BatchMetadata = Omit<StoredBatchInfo, "batchHash">;

/** Struct passed to contract by the sequencer for each batch */
export interface CommitBatchInfo {
  batchNumber: bigint;
  timestamp: bigint;
  indexRepeatedStorageChanges: bigint;
  newStateRoot: string;
  numberOfLayer1Txs: bigint;
  priorityOperationsHash: string;
  bootloaderHeapInitialContentsHash: string;
  eventsQueueStateHash: string;
  systemLogs: string;
  totalL2ToL1Pubdata: Uint8Array;
}

/** Proof returned by zkSync RPC */
export type RpcProof = {
  account: string;
  key: string;
  path: Array<string>;
  value: string;
  index: number;
};

export type StorageProofBatch = {
  metadata: BatchMetadata;
  proofs: RpcProof[];
};

export type StorageProof = RpcProof & {
  metadata: BatchMetadata;
};

export type Message = {
  nexusAppIDFrom: string; // bytes32 -> string
  nexusAppIDTo: string[]; // bytes32[] -> string[]
  data: string; // bytes -> string
  from: string; // address -> string
  to: string[]; // address[] -> string[]
  nonce: bigint | string;
};

export type NexusState = {
  stateRoot: string;
  blockHash: string;
};

export type NexusInfo = {
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
