use anyhow::Result;
use console::{style, StyledObject};
use ethers::abi::encode;
use ethers::core::abi::Abi;
use ethers::{
    prelude::*,
    signers::{LocalWallet, MnemonicBuilder},
    utils::*,
};
use reqwest::blocking::Client;
use rlp::RlpStream;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::{sync::Arc, vec};

// fill these after deployment
const BRIDGE_ADDRESS_137: &str = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const BRIDGE_ADDRESS_138: &str = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const STATE_MANAGER_ADDR: &str = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

abigen!(BridgeContract, "bridge.json");
abigen!(StateContract, "nexusStateManager.json");
#[derive(Debug)]
pub struct Proof {
    proof: EIP1186ProofResponse,
    block_number: U64,
    state_hash: H256,
    address: H160,
    storage_slot: [u8; 32],
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct StatementDigest(pub [u32; 8]);

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct AccountState {
    pub statement: StatementDigest,
    pub state_root: [u8; 32],
    pub start_nexus_hash: [u8; 32],
    pub last_proof_height: u32,
    pub height: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct ProofResponse {
    leaves_bitmap: Vec<Vec<u8>>,
    merkle_path: Vec<String>, // Assuming merkle_path is an array of strings, adjust type if needed
}

#[derive(Serialize, Deserialize, Debug)]
struct RpcResponse {
    account: AccountState,
    proof: ProofResponse,
}

const TICK_MARK_SYMBOL: &str = "✓";
const CROSS_MARK_SYMBOL: &str = "x";

static TICK_MARK: StyledObject<&str> = style(TICK_MARK_SYMBOL).green().bold();
static CROSS_MARK: StyledObject<&str> = style(CROSS_MARK_SYMBOL).red().bold();

pub async fn crosschain_wrapper() -> Result<()> {
    let private_key = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    let wallet = private_key.parse::<LocalWallet>()?;

    let rpc_provider1 = Arc::new({
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8545")?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let rpc_provider2 = Arc::new({
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8546")?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let _ = crosschain(
        rpc_provider1,
        rpc_provider2,
        BRIDGE_ADDRESS_137,
        STATE_MANAGER_ADDR,
    )
    .await;
    Ok(())
}

async fn crosschain(
    rpc_provider_origin: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    bridge_address: &str,
    state_manager_address: &str,
) -> Result<()> {
    // assuming deployment of StorageProof contract is already done

    let address = bridge_address.parse::<Address>()?;

    let abi = read_abi_from_file("./bridge.json").unwrap();
    let bridge_contract_origin =
        Contract::new(address, abi.clone(), Arc::new(rpc_provider_origin.clone()));

    match send_eth_and_receive_proof(rpc_provider_origin, bridge_contract_origin).await {
        Ok(storage_proof) => {
            println!("{} {:?}", style("Storage Proof: ").dim(), storage_proof);
            // call and update nexus state manager for this block

            let state_manager_destination = StateContract::new(
                state_manager_address.parse::<Address>()?,
                Arc::new(rpc_provider_destination.clone()),
            );

            let encoded_proof = format!("0x{}", encode_proof(storage_proof.proof.account_proof));

            let base_url = "http://localhost:7000/accounts";
            let account_app_id = "<hash>"; // Replace <hash> with the actual hash value

            let client = Client::new();

            let response = client
                .get(base_url)
                .query(&[("account_app_id", account_app_id)])
                .send()?;
            let json_response = response.text()?;

            let rpc_response: RpcResponse = serde_json::from_str(json_response.as_str())?;
            // fetch account proof from nexus
            let method_call = state_manager_destination.update_chain_state(
                U256::from(11),
                rpc_response.proof.merkle_path.clone(),
                account_app_id,
                rpc_response.account.clone(),
            );

            let result = method_call.send().await;

            match result {
                Ok(tx) => {
                    println!("{} {}", TICK_MARK,style("Successfully updated the origin chain state on destination chain using nexus proof").green().italic());
                    let finalisation = tx.confirmations(1).await?;
                    match finalisation {
                        Some(_) => {
                            update_nexus_state_root_and_bridge(
                                rpc_provider_destination,
                                encoded_proof,
                                storage_proof,
                            );
                        }
                        None => {
                            eprint!("{} {}", CROSS_MARK, style("Error - invalid tx").red());
                        }
                    }
                }
                Err(e) => {
                    eprintln!(
                        "{} {} {:?}",
                        CROSS_MARK,
                        style("Error sending transaction: ").red(),
                        e
                    );
                }
            }
        }
        Err(e) => {
            eprint!("{} {} {:?}", CROSS_MARK, style("error: ").red(), e);
        }
    }

    Ok(())
}

async fn update_nexus_state_root_and_bridge(
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    encoded_proof: String,
    proof: Proof,
) -> Result<()> {
    println!(
        "{}",
        style("Now minting by calling receiveEth on destination chain").green()
    );

    let bridge_contract_destination = BridgeContract::new(
        BRIDGE_ADDRESS_138.parse::<Address>()?,
        rpc_provider_destination.clone(),
    );

    mock_send_transaction_on_destination_to_fund_contract(bridge_contract_destination);

    let value1 = abi::Token::String(
        "4554480000000000000000000000000000000000000000000000000000000000".to_string(),
    );
    let value2 = abi::Token::Uint(1.into());
    let encoded = encode(&[value1, value2]);

    // TODO: fix typo
    let message = MessageReceieve {
        message_type: [0x02],
        from: hex::decode("00000000000000000000000070997970C51812dc3A010C7d01b50e0d17dc79C8")?
            .try_into()
            .unwrap(),
        to: hex::decode("0000000000000000000000003347B4d90ebe72BeFb30444C9966B2B990aE9FcB")?
            .try_into()
            .unwrap(),
        origin_domain: 1_u32,
        destination_domain: 2_u32,
        data: Bytes::from(encoded),
        message_id: 2_u64,
        storage_proof: proof.proof.storage_proof,
        storage_slot: proof.storage_slot,
    };

    let tx = bridge_contract_destination
        .receive_eth(message, Bytes::from(encoded_proof.as_bytes().to_vec()));

    let receipt = tx.send().await;

    match receipt {
        Ok(rec) => {
            println!(
                "{} {}",
                TICK_MARK,
                style("Successfully called recieve eth function to unlock funds on target chain")
                    .green()
                    .bold()
            );
            let rr = rec.await;

            // TODO: remove the line below
            println!("{:?}", rr);
        }
        Err(err) => {
            let error_string = format!("{:?}", err);

            if error_string.contains("Revert") {
                println!(
                    "{} {} {:?}",
                    CROSS_MARK,
                    style("Transaction reverted with data:").red(),
                    err
                );
            } else {
                println!(
                    "{} {} {:?}",
                    CROSS_MARK,
                    style("Transaction failed: ").red(),
                    err
                );
            }
        }
    }
    Ok(())
}

async fn mock_send_transaction_on_destination_to_fund_contract(
    bridge_contract_destination: BridgeContract<SignerMiddleware<Provider<Http>, LocalWallet>>,
) -> Result<()> {
    let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let address_bytes = hex::decode(address_str).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];

    padded_address[12..].copy_from_slice(&address_array);
    let amount_to_send: U256 = U256::from(1_000_000_000_000_000_000_u64);

    let provider = Provider::<Http>::try_from("http://localhost:8546")?;
    let block_n = provider.get_block_number().await?;

    let send_tx = bridge_contract_destination
        .send_eth(padded_address)
        .value(amount_to_send);
    let _ = send_tx.send().await;
    Ok(())
}
fn encode_proof(account_proofs: Vec<Bytes>) -> String {
    let proofs = concatenate_proof(account_proofs);
    let rlp_encoded_proof = encode_rlp(proofs);
    let proof_hex = hex::encode(rlp_encoded_proof);
    proof_hex
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

pub async fn send_eth_and_receive_proof(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: Contract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
) -> Result<Proof> {
    let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let address_bytes = hex::decode(address_str).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];
    padded_address[12..].copy_from_slice(&address_array);

    let recipient: H256 = H256::from(padded_address);

    let amount_to_send = U256::from(1_000_000_000u64);

    let method_call = contract
        .method::<(H256,), ()>("sendETH", (recipient,))?
        .value(amount_to_send);

    let tx = method_call.send().await?;

    let receipt = tx.confirmations(1).await?;
    if let Some(receipt) = receipt {
        let block_number = receipt.block_number.unwrap();
        println!(
            "{} {} {:?}",
            TICK_MARK,
            style("Successfully called Send Eth on origin chain")
                .green()
                .italic(),
            receipt.status
        );
        let block = provider.get_block(BlockNumber::Latest).await?.unwrap();
        let state_root = block.state_root;

        let storage_slot = get_storage_slot(contract.clone()).await?;

        let proof: EIP1186ProofResponse = get_storage(
            provider,
            contract.clone(),
            BlockId::from(block_number),
            storage_slot,
        )
        .await?;

        println!(
            "{} {} {:?}",
            TICK_MARK,
            style("Successfully fetched the storage proof from origin chain")
                .green()
                .italic(),
            proof.storage_proof.clone()
        );

        let proof_extended = Proof {
            proof: proof,
            block_number: block_number,
            state_hash: state_root,
            address: contract.address(),
            storage_slot: storage_slot,
        };

        return Ok(proof_extended);
    }
    Err(anyhow::anyhow!("Transaction receipt not found"))
}

async fn get_storage_slot(
    contract: Contract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
) -> Result<[u8; 32]> {
    let key = contract.method::<_, U256>("messageId", ())?.call().await?;
    let slot = U256::zero();
    let mut encoded = [0u8; 64];
    key.to_big_endian(&mut encoded[0..32]);
    slot.to_big_endian(&mut encoded[32..64]);

    let storage_slot = keccak256(&encoded);
    Ok(storage_slot)
}
async fn get_storage(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: Contract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
    block_number: BlockId,
    storage_slot: [u8; 32],
) -> Result<EIP1186ProofResponse> {
    let address = contract.address();
    let proof = provider
        .get_proof(address, vec![H256::from(storage_slot)], Some(block_number))
        .await?;
    Ok((proof))
}

fn read_abi_from_file(file_path: &str) -> Result<Abi, Box<dyn std::error::Error>> {
    let mut file = File::open(file_path)?;

    let mut abi_json = String::new();
    file.read_to_string(&mut abi_json)?;

    let abi: Abi = serde_json::from_str(&abi_json)?;

    Ok(abi)
}

use ::hex::FromHex;
fn hex_to_bytes(hex: &str) -> Result<Bytes, hex::FromHexError> {
    // Remove the "0x" prefix if it exists
    let hex_trimmed = hex.trim_start_matches("0x");
    // Decode the hex string to a byte vector
    let bytes = Vec::from_hex(hex_trimmed)?;
    // Convert the byte vector to Bytes
    Ok(Bytes::from(bytes))
}
