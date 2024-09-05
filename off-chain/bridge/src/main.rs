#![allow(warnings)]

use std::fs::File;
use std::io::Read;
use std::{sync::Arc, vec};

use abi::{ParamType, Token};
use anyhow::Result;
use dotenv::dotenv;
use ethers::abi::{decode, encode};
use ethers::core::abi::Abi;
use ethers::{prelude::*, utils::keccak256};
use rlp::{Encodable, RlpStream};
use std::env;

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
    let block = rpc_provider
        .get_block(BlockNumber::from(56698129))
        .await?
        .unwrap();

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

#[tokio::main]
async fn main() {
    dotenv().ok();

    // let rpc_provider = Provider::<Http>::try_from(
    //     "https://arbitrum-sepolia.infura.io/v3/405e261a9beb469595d838b68061ea2f",
    // )
    // .unwrap();
    // let blocknumber = get_encoded_block_header(&rpc_provider).await.unwrap();
    // // // // Random account
    // // let account = "0x34e45Fc2f0BaDB03a680Ec37d5F69eD1a7835aDa";
    // // let _ = get_account_proof(56, &rpc_provider, account).await;

    // // // Goerli USDC contract address
    // let account = "0x34e45Fc2f0BaDB03a680Ec37d5F69eD1a7835aDa";
    // let storage_slot_str = "0xfb34942ebc6f77e2a4779d58cebad9f418cb83cee5ae5135ce8e901b843c3496";
    // let storage_slot = storage_slot_str.parse::<H256>().unwrap();

    // let _ = get_storage_proof(blocknumber, &rpc_provider, account, storage_slot).await;

    if let Err(e) = crosschain_wrapper().await {
        println!("Error in crosschain_wrapper: {:?}", e);
    }
}
