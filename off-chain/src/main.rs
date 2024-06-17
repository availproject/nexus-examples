use std::fs::File;
use std::io::Read;
use std::{sync::Arc, vec};

use anyhow::Result;
use ethers::core::abi::Abi;
use ethers::{prelude::*, utils::keccak256};
use rlp::{Encodable, RlpStream};

use crate::blockheader::{EvmBlockHeader, EvmBlockHeaderFromRpc};
use crate::bridge::crosschain_wrapper;

mod blockheader;
mod bridge;

fn encode_block_header(header: &EvmBlockHeader) -> Vec<u8> {
    let mut stream = RlpStream::new();
    header.rlp_append(&mut stream);
    stream.out().to_vec()
}

pub async fn get_encoded_block_header(rpc_provider: &Provider<Http>) -> Result<u64> {
    let block = rpc_provider.get_block(BlockNumber::Latest).await?.unwrap();

    println!("block number: {:?}\n", block.number);

    let header_from_rpc = EvmBlockHeaderFromRpc {
        number: block.number.unwrap().as_u64().to_string(),
        hash: hex::encode(block.hash.unwrap()),
        difficulty: block.difficulty.to_string(),
        extra_data: hex::encode(block.extra_data),
        gas_limit: block.gas_limit.to_string(),
        gas_used: block.gas_used.to_string(),
        logs_bloom: hex::encode(block.logs_bloom.unwrap()),
        miner: hex::encode(block.author.unwrap()),
        mix_hash: hex::encode(block.mix_hash.unwrap()),
        nonce: hex::encode(block.nonce.unwrap()),
        parent_hash: hex::encode(block.parent_hash),
        receipts_root: hex::encode(block.receipts_root),
        sha3_uncles: hex::encode(block.uncles_hash),
        size: block.size.unwrap().to_string(),
        state_root: hex::encode(block.state_root),
        timestamp: block.timestamp.to_string(),
        total_difficulty: block.total_difficulty.unwrap().to_string(),
        transactions_root: hex::encode(block.transactions_root),
        base_fee_per_gas: block.base_fee_per_gas.map(|value| value.to_string()),
        withdrawals_root: block.withdrawals_root.map(hex::encode),
        blob_gas_used: block.blob_gas_used.map(|value| value.to_string()),
        excess_blob_gas: block.excess_blob_gas.map(|value| value.to_string()),
        parent_beacon_block_root: block.parent_beacon_block_root.map(hex::encode),
    };

    let evm_block_header = EvmBlockHeader::from(&header_from_rpc);
    println!("{:?}", block.state_root);
    println!("{:#?}", evm_block_header);

    let encoded_block_header = encode_block_header(&evm_block_header);
    let blockheader_hex = hex::encode(&encoded_block_header);
    println!("Hexadecimal Block Header: 0x{}\n", blockheader_hex);

    let blockhash = keccak256(encoded_block_header);

    // assert_eq!(blockhash, block.hash.unwrap().0);

    let blockhash_hex = hex::encode(blockhash);

    println!("Hexadecimal Block Hash: 0x{}\n", blockhash_hex);

    Ok(evm_block_header.number)
}

async fn get_account_proof(
    blocknumber: u64,
    rpc_provider: &Provider<Http>,
    account: &str,
) -> Result<()> {
    let proof_response = rpc_provider
        .get_proof(
            account,
            vec![H256::zero()],
            Some(BlockId::Number(BlockNumber::Number(blocknumber.into()))),
        )
        .await;

    match proof_response {
        Ok(res) => {
            let account_proofs = res.account_proof;
            let proofs = concatenate_proof(account_proofs);
            let rlp_encoded_proof = encode_rlp(proofs);
            let proof_hex = hex::encode(rlp_encoded_proof);
            println!("proof: 0x{}\n", proof_hex);
            println!("account: {:?}\n", account);
        }
        Err(e) => {
            println!("err {:?}", e);
        }
    }

    Ok(())
}

fn concatenate_proof(account_proof: Vec<ethers::types::Bytes>) -> Vec<Vec<u8>> {
    let mut proofs: Vec<Vec<u8>> = Vec::new();
    for node in account_proof {
        proofs.push(node.to_vec()); // Convert each Bytes to Vec<u8> and push to proofs
    }
    proofs
}

fn encode_rlp(proofs: Vec<Vec<u8>>) -> Vec<u8> {
    let mut stream = RlpStream::new();
    stream.begin_list(proofs.len()); // Begin a list to encode the array structure
    for proof in proofs {
        stream.append(&proof); // Append each proof as raw bytes
    }
    stream.out().to_vec() // Get the RLP-encoded bytes
}

async fn get_storage_proof(
    blocknumber: u64,
    rpc_provider: &Provider<Http>,
    account: &str,
    slot: H256,
) -> Result<()> {
    let proof_response = rpc_provider
        .get_proof(
            account,
            vec![slot],
            Some(BlockId::Number(BlockNumber::Number(blocknumber.into()))),
        )
        .await?;

    println!("{:#?}", proof_response);

    let account_proofs = proof_response.account_proof;
    let proofs = concatenate_proof(account_proofs);
    let rlp_encoded_proof = encode_rlp(proofs);
    let proof_hex = hex::encode(rlp_encoded_proof);
    println!("account proof storage: 0x{}\n", proof_hex);

    let storageproof = proof_response.storage_proof;
    let proofs = concatenate_proof(storageproof[0].proof.clone());
    let rlp_encoded_proof = encode_rlp(proofs);
    let proof_hex = hex::encode(rlp_encoded_proof);
    println!("storage proof: 0x{}\n", proof_hex);
    println!("storage account: {:?}\n", account);
    println!("storage slot: {:?}\n", slot);

    Ok(())
}

fn read_abi_from_file(file_path: &str) -> Result<Abi, Box<dyn std::error::Error>> {
    let mut file = File::open(file_path)?;

    let mut abi_json = String::new();
    file.read_to_string(&mut abi_json)?;

    let abi: Abi = serde_json::from_str(&abi_json)?;

    Ok(abi)
}

// const ADDRESS_1337: &str = "0x";
// const ADDRESS_1338: &str = "0x";

// async fn crosschain_wrapper() -> Result<()> {
//     let rpc_provider1 = Provider::<Http>::try_from("http://127.0.0.1:8545").unwrap();
//     let rpc_provider2 = Provider::<Http>::try_from("http://127.0.0.1:8546").unwrap();

//     let _ = store_crosschain(rpc_provider1, rpc_provider2, ADDRESS_1337).await;
//     Ok(())
// }

// async fn store_crosschain(
//     rpc_provider_destination: Provider<Http>,
//     rpc_provider_target: Provider<Http>,
//     address: &str,
// ) -> Result<()> {
//     // assuming deployment of StorageProof contract is already done
//     let block = rpc_provider_destination
//         .get_block(BlockNumber::Latest)
//         .await?
//         .unwrap();
//     let state_root = block.state_root;
//     let address = address.parse::<Address>()?;
//     let abi = read_abi_from_file("./abi.json").unwrap();
//     let contract = Contract::new(address, abi, Arc::new(rpc_provider_target.clone()));
//     let call = contract.method::<_, H256>("updateState", (1337, state_root))?;
//     let pending_tx = call.send().await?;

//     let receipt = pending_tx.confirmations(6).await?;
//     println!("{:?}", receipt);
//     Ok(())
// }
#[tokio::main]
async fn main() {
    // let rpc_provider = Provider::<Http>::try_from("http://localhost:8545").unwrap();
    // let blocknumber = get_encoded_block_header(&rpc_provider).await.unwrap();
    // // // Random account
    // let account = "0x2C032Aa43D119D7bf4Adc42583F1f94f3bf3023a";
    // let _ = get_account_proof(56, &rpc_provider, account).await;

    // // // Goerli USDC contract address
    // let account = "0xDC11f7E700A4c898AE5CAddB1082cFfa76512aDD";
    // let storage_slot_str = "0xa20a1f31e7e0c47a407717c0b73e822e9ce414e0fc1925c4df69c43f77ac765e";
    // let storage_slot = storage_slot_str.parse::<H256>().unwrap();

    // let _ = get_storage_proof(blocknumber, &rpc_provider, account, storage_slot).await;

    if let Err(e) = crosschain_wrapper().await {
        println!("Error in crosschain_wrapper: {:?}", e);
    }
}

// EvmBlockHeader {
//     parent_hash: "1ceab484f3c73b4bae8c70888f634905a242b26b42d1eab73e7fafd96a6e65c7",
//     uncle_hash: "1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
//     coinbase: "184ba627db853244c9f17f3cb4378cb8b39bf147",
//     state_root: "b1f5a5df4e9179f420a4d432f14eb66b8e0f9fe4f34f1ef557b4ec1c7c3ed1e1",
//     transactions_root: "ea341386e029d58c9cd0809b93891767e90e7762014022420db3a7446debf8ec",
//     receipts_root: "13dc689f62f2e34c3c486e4115aa8aa9b808cc85087dceeeb2501a55fa5f897a",
//     logs_bloom: "aa1e5cdf9924553725d3f612bc3894dcc8da4b90ef0114f95198eb6cc5ef320d47e83dd4dc37e0387798eaf84b8711c078ade0c0634d7cea6ed85adbe8f4b5adda64e61ebe7f3c4e6824b57b31b97afc7c08da9250d4c78d364c2c9d2e72fec68a270d1aaa3589fef54395261268dd8c291a98cd6545be0ea3fe5a586ddf3ebf772017fbf159de39b205d109fd34bec2908b3a8052bdd727d1fbd86737f377a86e677ee3412051c62174290f5eed2d283741e6c2a90d4e9395d500facbc00bc5d66d5fab70f74267539c7c3b7dbaca83b7b4dbf17a3c9b54a356b6b6f34b64482d119f13155af6ec013ecddb78cbabbcac16b2ec1e8bb0f5cb51ca91c57c43cd",
//     difficulty: 0,
//     number: 6091251,
//     gas_limit: 30000000,
//     gas_used: 29870105,
//     timestamp: 1718181492,
//     extra_data: "4275696c644149202868747470733a2f2f6275696c6461692e6e657429",
//     mix_hash: "f1d4ae0b01a41956db05f9ba40a8ffc6c9faf5935614abce41f535287d39f031",
//     nonce: "0000000000000000",
//     base_fee_per_gas: Some(
//         6508798014,
//     ),
//     withdrawals_root: Some(
//         "31f7c1e2776785da2db602bd7448a3516321eec40ff93316593d5d55bf693732",
//     ),
//     blob_gas_used: Some(
//         0,
//     ),
//     excess_blob_gas: Some(
//         0,
//     ),
//     parent_beacon_block_root: Some(
//         "20f402309dec1f9e70c41de34bb97f328195f530f4c6b261657bf7be30432492",
//     ),
// }
