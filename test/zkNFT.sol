pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/example/zknft/NFT.sol";
import "../contracts/example/zknft/NftPayment.sol";
import "../contracts/NexusProofManager.sol";
import "../contracts/interfaces/INexusProofManager.sol";
import "../contracts/example/mock/ERC20.sol";
import "../contracts/example/mock/ERC721.sol";

contract ZKNFTTest is Test  { 
    NexusProofManager proofManager;
    NFTPayment paymentContract;
    MyNFT nftContract;
    ERC20Token erc20;

    uint256 mintAmount = 1 ether;
    uint256 blockNumber = 10;
    bytes32 stateRoot = keccak256(abi.encode("sjkdlfnkdsl"));
    bytes32 blockHash = keccak256(abi.encode("sjkdlfnkdsl"));

    function setUp() public { 
        address bob = vm.addr(2);
        erc20 = new ERC20Token("Avail","Avail");
        proofManager = new NexusProofManager(bytes32(uint256(27)));
        nftContract = new MyNFT(bytes32(uint256(uint160(137))), bytes32(uint256(uint160(1337))), INexusProofManager(address(proofManager)), address(0));
        paymentContract = new NFTPayment(INexusProofManager(address(proofManager)), bob, address(nftContract));
        nftContract.updateTargetContract(address(paymentContract));
        paymentContract.updatePrice(address(erc20), mintAmount);
    }

    function testPaymentWithoutFallback() public { 
        erc20.mint(address(this), 2* mintAmount);
        erc20.approve(address(paymentContract), 2*mintAmount);
        paymentContract.paymentWithoutFallback(
            0x04, 137, 2*mintAmount, address(erc20)
        );
    }

    function testNexusStateManagerUpdate() public { 
        proofManager.updateNexusBlock(blockNumber, NexusProofManager.NexusBlock(stateRoot, blockHash));
    }

    // function testReceiveNFTOnDestination() public { 
    //     nftContract.mintNFT(
    //         vm.addr(3),

    //     )
    // }
}