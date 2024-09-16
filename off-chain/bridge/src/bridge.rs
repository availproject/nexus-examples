use anyhow::anyhow;
use anyhow::Result;
use console::{style, StyledObject};
use ethers::abi::encode;
use ethers::core::abi::Abi;
use ethers::{prelude::*, signers::LocalWallet, utils::*};
use reqwest::Client;
use rlp::RlpStream;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs::File;
use std::io::Read;
use std::time::Duration;
use std::{sync::Arc, vec};

abigen!(BridgeContract, "bridge.json");
abigen!(StateContract, "nexusStateManager.json");
abigen!(ERC20, "erc20.json");

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NexusH256([u8; 32]);
impl NexusH256 {
    pub fn into_inner(self) -> [u8; 32] {
        self.0
    }
}
#[derive(Debug)]
pub struct Proof {
    proof: EIP1186ProofResponse,
    address: H160,
    storage_slot: [u8; 32],
    state_root: H256,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AccountState {
    pub statement: [u32; 8],
    pub state_root: [u8; 32],
    pub start_nexus_hash: [u8; 32],
    pub last_proof_height: u128,
    pub height: u128,
}

impl From<AccountState> for state_contract::AccountState {
    fn from(wrapper: AccountState) -> Self {
        let mut bytes = vec![];
        for num in wrapper.statement {
            bytes.extend(num.to_be_bytes());
        }
        if bytes.len() != 32 {
            panic!("The Vec must be exactly 32 elements long");
        }
        let mut array = [0u8; 32];
        array.copy_from_slice(&bytes);

        state_contract::AccountState {
            statement_digest: array,
            state_root: wrapper.state_root,
            start_nexus_hash: wrapper.start_nexus_hash,
            last_proof_height: wrapper.last_proof_height,
            height: wrapper.height,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NexusHeader {
    pub parent_hash: NexusH256,
    pub prev_state_root: NexusH256,
    pub state_root: NexusH256,
    pub avail_header_hash: NexusH256,
    pub number: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct RpcResponse {
    pub account: AccountState,
    pub proof: Vec<[u8; 32]>,
    pub value_hash: [u8; 32],
    pub nexus_header: NexusHeader,
    pub account_encoded: String,
    pub proof_hex: Vec<String>,
    pub value_hash_hex: String,
    pub nexus_state_root_hex: String,
}

pub async fn crosschain_wrapper() -> Result<()> {
    println!("{} {}", style("What is Nexus").bold().bright(), style("Avail Nexus is a permissionless framework to unify the web3 ecosystem. It connects multiple blockchains both within and outside the Avail ecosystem, leveraging Avail DA as the root of trust."));
    let private_key = env::var("PRIVATE_KEY").expect("Require PRIVATE Key to send transactions");
    let wallet = private_key.parse::<LocalWallet>()?;

    let rpc_provider1 = Arc::new({
        let provider = Provider::<Http>::try_from(
            env::var("RPC_PROVIDER_ORIGIN").expect("Require origin RPC URL"),
        )?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let rpc_provider2 = Arc::new({
        let provider = Provider::<Http>::try_from(
            env::var("RPC_PROVIDER_DESTINATION").expect("Require RPC provider destination"),
        )?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let _ = crosschain(
        rpc_provider1,
        rpc_provider2,
        get_origin_bridge_addr().as_str(),
        get_destination_state_manager_addr().as_str(),
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
    let bridge_contract_origin = BridgeContract::new(
        get_origin_bridge_addr().as_str().parse::<Address>()?,
        Arc::new(rpc_provider_origin.clone()),
    );

    println!(
        "{} {}",
        exclamation_mark(),
        style("Sending ETH to bridge on origin chain ....")
    );

    match send_eth_origin(rpc_provider_origin.clone(), bridge_contract_origin).await {
        Ok(_) => {
            let state_manager_destination = StateContract::new(
                state_manager_address.parse::<Address>()?,
                Arc::new(rpc_provider_destination.clone()),
            );

            let base_url = env::var("NEXUS_BASE_URL").expect("NEXUS base url missing");

            let client = Client::new();

            println!("{} {}", exclamation_mark(), style("Calling nexus for the latest nexus state and corresponding rollup account state ...."));

            let response = client
                .get(base_url)
                .query(&[("app_account_id", get_account_id().as_str())])
                .send()
                .await?;

            let text_response = response.text().await?;
            // println!("text ressponse {:?}", text_response);
            let rpc_response = serde_json::from_str::<RpcResponse>(text_response.as_str());

            let rpc_response = rpc_response.unwrap();

            println!(
                "{} {}",
                tick_mark(),
                style("Successfully fetched data from nexus")
            );

            println!(
                "{} {}",
                exclamation_mark(),
                style("Updating new nexus block info on the destination chain ....")
            );

            let nexus_update = state_manager_destination
                .update_nexus_block(
                    U256::from(rpc_response.account.height),
                    NexusBlock {
                        state_root: rpc_response.nexus_header.state_root.clone().into_inner(),
                        block_hash: rpc_response.nexus_header.state_root.into_inner(),
                    },
                )
                .legacy();

            let result = nexus_update
                .send()
                .await?
                .log_msg("Pending transfer hash")
                .await;

            match result {
                Ok(_) => {
                    println!("{} {}", tick_mark(), style("Successfully updated nexus state on destination chain. This state contains the changes done on origin chain secured by Nexus."));

                    update_chain_state_and_bridge(
                        state_manager_destination,
                        rpc_provider_destination,
                        rpc_provider_origin,
                        rpc_response.proof,
                        rpc_response.account,
                        bridge_address,
                    )
                    .await?;
                }
                Err(e) => {
                    println!(
                        "{} {} {:?}",
                        cross_mark(),
                        style("Error updating nexus state: ").red(),
                        e
                    )
                }
            }
        }
        Err(e) => {
            eprint!("{} {} {:?}", cross_mark(), style("error: ").red(), e);
        }
    }

    Ok(())
}

async fn update_chain_state_and_bridge(
    state_manager_destination: StateContract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    rpc_provider_origin: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    rpc_response_proof: Vec<[u8; 32]>,
    rpc_response_account: AccountState,
    bridge_address: &str,
) -> Result<()> {
    let account_state = state_contract::AccountState::from(rpc_response_account);
    let address = bridge_address.parse::<Address>()?;

    // println!(
    //     "{} updating chain state to {}",
    //     style("Info: ").dim(),
    //     hex::encode(account_state.state_root)
    // );
    let block_number = account_state.height as u64;
    let bytes_app_id = hex::decode(get_account_id().as_str()).expect("Failed to decode hex string");
    let account_app_id: [u8; 32] = bytes_app_id
        .try_into()
        .expect("Hex string is not 32 bytes long");

    println!("{} {}", exclamation_mark(), style("Updating the state root for origin, on destination by extracting it from nexus state root on-chain ...."));

    // fetch account proof from nexus
    let method_call = state_manager_destination
        .update_chain_state(
            U256::from(block_number),
            rpc_response_proof,
            account_app_id,
            account_state,
        )
        .legacy();

    let result = method_call
        .send()
        .await?
        .log_msg("Pending transfer hash for updating chain state on destination")
        .await;

    match result {
        Ok(tx) => {
            println!("{} {}", tick_mark(),style("Successfully updated the origin chain state on destination chain using nexus proof"));
            println!("{} {}", exclamation_mark(), style("Fetching storage proof from origin chain for a given storage slot for bridge contract ...."));
            let proof = get_storage_proof(
                rpc_provider_origin.clone(),
                BridgeContract::new(
                    get_origin_bridge_addr().as_str().parse::<Address>()?,
                    Arc::new(rpc_provider_origin),
                ),
                BlockId::from(block_number),
            )
            .await?;
            println!("{} {}", exclamation_mark(), style("Now calling the bridge on the other side, to unlock funds thanks to the security of the state update of origin done using Nexus ...."));
            bridge_eth_on_receiver(rpc_provider_destination, proof).await?;
        }
        Err(e) => {
            eprintln!(
                "{} {} {:?}",
                cross_mark(),
                style("Error sending transaction: ").red(),
                e
            );
        }
    }
    Ok(())
}

async fn bridge_eth_on_receiver(
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    proof: Proof,
) -> Result<()> {
    let bridge_address = get_destination_bridge_addr().as_str().parse::<Address>()?;
    let bridge_contract_destination =
        BridgeContract::new(bridge_address, rpc_provider_destination.clone());

    let encoded_storage_proof = encode_proof(proof.proof.storage_proof[0].proof.clone());
    let encoded_account_proof = encode_proof(proof.proof.account_proof);

    let weth_asset_id = env::var("WETH_ASSET_ID").expect("WETH ASSET ID not given");
    let mut asset_id_bytes = hex::decode(weth_asset_id.trim_start_matches("0x"))
        .expect("Failed to decode WETH_ASSET_ID as hexadecimal");
    asset_id_bytes.resize(32, 0);
    let value1 = abi::Token::FixedBytes(asset_id_bytes);
    let value2 = abi::Token::Uint(get_transfer_amount());
    let encoded = encode(&[value1, value2]);

    println!(
        "{} {}",
        exclamation_mark(),
        style("Calling receive function on destination chain ....")
    );

    let address = env::var("FROM_ADDRESS").expect("Destination address not availaible");
    let to_address = proof.address.to_fixed_bytes();
    let mut output = [0; 32];
    output[12..32].copy_from_slice(&to_address);

    let message = MessageReceieve {
        message_type: [0x02],
        from: hex::decode(&format!("{}{}", "000000000000000000000000", &address[2..]))
            .unwrap()
            .try_into()
            .unwrap(),
        to: output,
        data: Bytes::from(encoded),
        message_id: 2_u64,
        storage_proof: Bytes::from(encoded_storage_proof),
        storage_slot: proof.proof.storage_proof[0].value.into(),
    };

    let tx = bridge_contract_destination
        .receive_erc20(message, Bytes::from(encoded_account_proof))
        .legacy();

    let receipt = tx.send().await;
    // println!("{:?}", receipt);
    let receipt2 = receipt?
        .log_msg("Pending transfer hash for receiving WETH on destination chain")
        .await;

    match receipt2 {
        Ok(rec) => {
            println!(
                "{} {}",
                tick_mark(),
                style("Successfully called recieve eth function to unlock funds on target chain")
                    .bold()
            );
        }
        Err(err) => {
            let error_string = format!("{:?}", err);
            println!(
                "{} {} {:?}",
                cross_mark(),
                style("Transaction reverted with data:").red(),
                err
            );
        }
    }
    Ok(())
}

fn encode_proof(account_proofs: Vec<Bytes>) -> Vec<u8> {
    let proofs = concatenate_proof(account_proofs);
    let rlp_encoded_proof = encode_rlp(proofs);
    rlp_encoded_proof
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

pub async fn send_eth_origin(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: BridgeContract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
) -> Result<()> {
    let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let address_bytes = hex::decode(address_str).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];
    padded_address[12..].copy_from_slice(&address_array);

    let recipient: H256 = H256::from(padded_address);

    let mut method_call = contract
        .send_eth(recipient.to_fixed_bytes())
        .value(get_transfer_amount())
        .legacy();

    let gas = method_call.estimate_gas().await.unwrap();
    method_call = method_call.gas(gas);
    let tx = method_call
        .send()
        .await?
        .log_msg("Pending transfer hash")
        .await?;

    match tx {
        Some(_) => {
            println!(
                "{} {} ",
                tick_mark(),
                style("Successfully locked ETH on origin chain")
            );
        }
        None => print!(
            "{} {}",
            cross_mark(),
            style("Cannot lock eth on bridge on origin chain").red()
        ),
    }

    println!(
        "{} {} ",
        style("Info: ").dim(),
        "Sleeping for 10 sec to let nexus update state...."
    );
    tokio::time::sleep(Duration::from_secs(10)).await;

    Ok(())
}

async fn get_storage_proof(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: BridgeContract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
    block_number: BlockId,
) -> Result<Proof> {
    let block = provider.get_block(block_number).await?.unwrap();

    let storage_slot = get_storage_slot(contract.clone()).await?;

    let proof: EIP1186ProofResponse = get_storage(
        provider,
        contract.clone(),
        BlockId::from(block_number),
        storage_slot,
    )
    .await?;

    println!(
        "{} {}",
        tick_mark(),
        style("Successfully fetched the storage proof from origin chain"),
    );

    println!(
        "{} Storage Slot: {:#?} State_root: {:?} Block_Number: {:?} Address: {:?}",
        style("Info: ").dim(),
        hex::encode(storage_slot),
        hex::encode(block.state_root),
        block_number,
        contract.address()
    );

    let proof_extended = Proof {
        proof: proof,
        address: contract.address(),
        storage_slot: storage_slot,
        state_root: block.state_root,
    };

    return Ok(proof_extended);
}

fn get_transfer_amount() -> U256 {
    U256::from(1_000_000_000_000_000_u64)
}
fn get_origin_bridge_addr() -> String {
    env::var("ORIGIN_BRIDGE_ADDRESS").expect("Origin Bridge Address required")
}

fn get_destination_bridge_addr() -> String {
    env::var("DESTINATION_BRIDGE_ADDRESS").expect("Destination Bridge Address required")
}

fn get_destination_state_manager_addr() -> String {
    env::var("DESTINATION_STATE_MANAGER_ADDRESS")
        .expect("Destination State Manager Address required")
}
fn get_account_id() -> String {
    env::var("NEXUS_APP_ID").expect("Nexus app id must be set")
}
fn tick_mark() -> StyledObject<&'static str> {
    let tick_mark_symbol: &str = "✓";
    style(tick_mark_symbol).green().bold()
}

fn cross_mark() -> StyledObject<&'static str> {
    let cross_mark_symbol: &str = "x";
    style(cross_mark_symbol).red().bold()
}

fn exclamation_mark() -> StyledObject<&'static str> {
    let cross_mark_symbol: &str = "!";
    style(cross_mark_symbol).blue().bold()
}
async fn get_storage_slot(
    contract: BridgeContract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
) -> Result<[u8; 32]> {
    let key = contract.method::<_, U256>("messageId", ())?.call().await?;
    let slot = U256::zero();
    let mut encoded = [0u8; 64];
    key.to_big_endian(&mut encoded[0..32]);
    slot.to_big_endian(&mut encoded[32..64]);

    let storage_slot = keccak256(&encoded);

    Ok(
        str_to_fixed_bytes("0xfb34942ebc6f77e2a4779d58cebad9f418cb83cee5ae5135ce8e901b843c3496")
            .unwrap(),
    )
}
async fn get_storage(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: BridgeContract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
    block_number: BlockId,
    storage_slot: [u8; 32],
) -> Result<EIP1186ProofResponse> {
    let address = contract.address();
    let proof = provider
        .get_proof(address, vec![H256::from(storage_slot)], Some(block_number))
        .await?;
    Ok((proof))
}

fn str_to_fixed_bytes(input: &str) -> Result<[u8; 32], hex::FromHexError> {
    let bytes = hex::decode(input)?;
    let mut result = [0u8; 32];
    result.copy_from_slice(&bytes);
    Ok(result)
}

/// ********************
/// EXTRA UTIL FUNCTIONS
/// ********************
use ::hex::FromHex;
fn hex_to_bytes(hex: &str) -> Result<Bytes, hex::FromHexError> {
    let hex_trimmed = hex.trim_start_matches("0x");

    let bytes = Vec::from_hex(hex_trimmed)?;

    Ok(Bytes::from(bytes))
}

async fn fund_bridge(
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    bridge_address: H160,
) -> Result<()> {
    let weth_address = env::var("WETH_ADDRESS")
        .expect("WETH ADDRESS not found")
        .parse::<Address>()?;
    let weth = ERC20::new(weth_address, rpc_provider_destination.clone());
    if let Err(err) = weth.mint(bridge_address, get_transfer_amount()).await {
        eprintln!("Error while minting WETH: {}", err);
    }
    Ok(())
}

async fn mock_send_transaction_on_destination_to_fund_contract(
    bridge_contract_destination: BridgeContract<SignerMiddleware<Provider<Http>, LocalWallet>>,
) -> Result<()> {
    let address_bytes =
        hex::decode(get_destination_bridge_addr().as_str()).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];

    padded_address[12..].copy_from_slice(&address_array);
    let amount_to_send: U256 = U256::from(1_000_000_000_u64);

    let provider = Provider::<Http>::try_from("http://localhost:8546")?;

    let send_tx = bridge_contract_destination
        .send_eth(padded_address)
        .value(amount_to_send)
        .legacy();
    let _ = send_tx
        .send()
        .await?
        .log_msg("Pending transfer hash")
        .await?;
    Ok(())
}
