import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { encode } from "@ethereumjs/rlp";
import { BaseTrie } from "merkle-patricia-tree";

describe("EVMStorageproof", function () {
  let evmStorageproofInstance: any;

  before(async function () {
    const EVMStorageproof = await ethers.getContractFactory("StorageProof");
    evmStorageproofInstance = await EVMStorageproof.deploy(1, 1337);
  });

  it("should return the correct block hash", async function () {
    const expectedHash =
      "0x02e85b90321b819e8c530e9e050830754aba1157378312cf7a3218c1937298aa";
    const blockNumber = 500;
    const actualHash = await evmStorageproofInstance.getBlockHash(blockNumber);
    expect(actualHash).to.equal(expectedHash);
  });

  it("should return the correct slot value", async function () {
    const storageRoot = ethers.keccak256(ethers.toUtf8Bytes("storageRoot"));
    const slot = ethers.keccak256(ethers.toUtf8Bytes("slot"));
    const slotValue = ethers.keccak256(ethers.toUtf8Bytes("value"));

    const trie = new BaseTrie();

    await trie.put(Buffer.from(encode(slot)), Buffer.from(encode(slotValue)));
    const proof = await BaseTrie.createProof(trie, Buffer.from(encode(slot)));

    const storageSlotTrieProof =
      "0x" + proof.map((n) => n.toString("hex")).join("");

    const returnedSlotValue = await evmStorageproofInstance.verifyStorage(
      storageRoot,
      slot,
      storageSlotTrieProof
    );

    console.log("Slot Value:", returnedSlotValue);

    expect(returnedSlotValue).to.equal(slotValue);
  });
});
