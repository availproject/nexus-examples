import { expect } from "chai";
//import { ethers } from "ethers";
import { ethers } from "hardhat";

import { encode } from "@ethereumjs/rlp";
import { BaseTrie } from "merkle-patricia-tree";
import axios from "axios";

describe("EVMStorageproof", function () {
  let nexusProofManager: any;
  const chainId = ethers.zeroPadValue("0x1011", 32);
  let concatenatedProof =
    "0xf90c89b90214f90211a076cc61de88523b91c5b58846209170acf383e4de5d1744b86ff793bc56634a73a0492f9069e2ac1f85ff7d5055c77ad6ffd97639c145a1f11092a16f7219443c8ca04b22dc0e39ad0122f088146bea0cf272604e49c92d001a3634d25ee799680f9da0296802e6d79dcba88a50e5f7bed110d95cc56d281e4bc977f0af142d104f2318a07ee099eeb3d4da6e128e1bea8aa11d1df65749730965354ae1b7077ad3f2598ea0e16d8cd72e575c396c9ad95f95c5cbde756210aa38549d9383ffd40fb52208b0a01f23d9d074cd534cce7c5860785436b90738d553d51386ed36fb9d2cd7f63722a02135b1190b075531dff56f9c236114b310d525c064122fece1aa7e9b26a2a7c5a0512db83049b0ad0338605ef32735575d7f85f08c598ce0eac9e8ffc325336c7ea0174aa733aa6877e54e1f817f0b1dab86c8728980a600cdc29a39ce5b85802d37a01cedfbe5a876f0680399d480e4eace36df654eae09ec19ecc484c41aa93c3327a093f9172d5a115d20bb28960e1bdc997c216079e60f811c87ea219d63bf551cc3a0b9a76f9443adb839b4780db3890652169360076035f1054c347508c8c2373c82a06fd4118595d04cac12feb849aafe93b3cbcf035e4052473390e4c02f72411e17a0eedca3d2f2e66458448d854dc2919c19337ff9856bbc134a43a4304fc5a94e12a0c832b8c18420e1bcb4d64b845d5402108dc6c0b3e8a8dde434b14cd39e99e58b80b90214f90211a05aeb6b522654b6225dc074400866cb2b649fe38760fb057ef621f4044c0f6739a0afb8c9b98d93c330b47523017c664f278ed89984dd4ee60cfd7709eb5012a3f7a043b698b18fb398bce3c10a478fbaa5acd3ed2df074f448f7a3d341591f851f0ea068057fe72bb309893fb971e7bb746b552a05c183337db9a54b87091b4e0277f7a07f064fc65b0c447487b9ce56da7c54da18552553174532e1ee87b6f331206e91a0cc9062c92b9bd5a9d27a558e908c4a5a51df75a82b38e7855b6d874c9333e303a09167dc3a4dc15860242938047ae7f936bd06840517b4152a3c5e5f1f69cba14ba0986272854986c9627d7e1d8a3cf4d866f066858429eca231afe50a70ef1d170ba04ccb2bc46fc833f0b82490eea06cad1b89d5456aac6d216e3b4ec821c596ce06a0f4687cf5d3451f7f94faafd6a287362193ee1d257aaabba82377904ba3c5a669a0850e4da9f30438fdd325ad22dd0e884875a5ade5c26b09bac0db7b4893b76406a0f7dcbc27aa8266c980718aa7ca71b791c6e2beb679a52f7f43e75768f0174a21a09fbe05639674a84079f712b0f2c7687b5efbd6e00cba55eeda1a5cd090e84d85a040f4b82b14ce2d1ca2686bf430ed855c9e2b7d6309ed0e343d9f0cc5aa84b7d1a0da0b68a07cd8882789f303f365da3633b1a40936604dcb07a227b183c7d21653a0bf03203024da1e6890b8023537da510cbaf0afbe5256a233538b5d36433b2b1e80b90214f90211a0f1c70dc2a40e31e59a01cc0dae1b5189514ee49b02d7c4fecdf98ec8946b602fa06d3b108a7cb08ffe448c42b9ce56f4f5ca7fd68b2f176db521b49f265f2e732aa08c88256b5fdc4d7834de1b1146d8ad8d4e0672f3a1a595d52cad2cd819bf56cda0c3b932d05ae5a96848e33882daf15d0f75430261d8b19dcb1634e2c179abc572a0ac5683d12f89aa7423b69f02a628f048454e40597b2c6a1d682eb8cca701d7d5a0184fbbc1240c50391e204292d9459f87ab3e41dd1637a9d11b762c41609b1878a0f7d326cd32de461a57b578e4d5e3ff5595252a4df06a16279ba4e4018d303820a013280505818c48dbebd6edaddfe58d41d8bdeb97c22c8d7c371ec1ed82e54ebba0b3f9715b3ae021badaa92d9972e32d4dfad42f34821610a239bfe237a90a5d7da09762ea29bef48348ec951328670689c0e7c839964c7a03ffc68124e72e473c4aa0718dac4d3459fe4efac347db662a12bbe994f57f5e0f76cab240a1384117edbba0033ecfb81f6d7b2df2287a26a85fd1464ce7c17ea81a6305f31b91a6e3e0dbeba094cb6dcd740d87294355ab3ec23c27fb35b4a4fecd97634bbeb911b5ea6cf94ca03598968293f8749fa636862b46d4bc87f19b3202601bab6423be552c74d585c1a0daf2705aa7ea290df0df7dbde46933dd8a281c816e52e9e6d73fc4d5b572d886a0a46af8a439a452c205c4c7f3cdb797d117a767a782ed650f0cc5704054447bbd80b90214f90211a052afd57a3c4e1aa0e634a617b8d94b8c19b60050b0796042ab320723faf6e3e7a0edc2f5715600ce3fb02a94e4b517bff3b5d2fa9e47726cc2deeef59f488f4b12a0cb8b635650df6d10300190ab8e282b7b7d99724aeb7d4222587f5fc6873182fda0baf00cad926a562a4c2db27365713e84c58ddbbff61c63646a3bd988e8f5337ca069c4752ec2a4aea68e3b186e65ad8c8e09ab41c57c379833a843b74e5822cea2a01309eda9b6f8c1cf96f6e63b324547b58684f31a8db5f80f759bdf4ac5e38a33a0558a27bbc1fd9bec2765e991753113206208dd638b8763c7c6505bbd2a65d753a0c4293938d8265289a65cd48b2518ea7bb34181d2c8d123ba688ce2b8cb62e12aa03300431e60bb81bcdbe02a9e491a4f69546fb5d4c1971749b9a25e86378875d7a0952538c579030bf738985e4d05f25d5c260f6e7db54ac309d1be31f41895341ca081da009d02c15806b6c3ddf8a7646dc8d01e36587dbe97fc7851bb351ceaeeb2a0f64193287a23a93510f9b0d05ec58ef35c591920eedd133995d293e9a6a69126a00e2e9408fc8231e9cbb17824f91a900a7e80d2bb15fd48980c3acddb97d78f5fa08e27ec5167947b3a9d8c4f015491823fc741311a91d9fef56a0c9b7d0b1c3fd2a0eaa4d70b89eaa4191eaa2b87d28d2e932646da2972c5883ff4e1e2647887ee14a02388bcfbed353ef34e7cfdb9bad1cf3b5729d7e70ca92d7aabe99cddfc4648c880b90214f90211a025e80141e804122368e9416a943862176d7cb0d989873b39010725a886ed1e28a05931414ed1510d12b462f5b1d185e15bdc58034a265c3a7b896486af4f43dfc1a088f059b4a266b4b7ec1af68112e05f2e2510cc188d473c427a7fdaf5b9d5fd3fa0a6bb4872bed9a05768f64506e0c285abbdd78b4f87731fcab1b204d6e278737da079a271d9d2a778a768103f00f1c2ec064f8dc50b6ca2f7c7e863602837d952a9a0629bc9e5e8206118be56c00b7a3e8f0717109385c5482719fbdc084fb90abdf7a056ef10fa2e85fbc885428b0250c4d694e5aa5c24719fcaa02129de4bc0efad47a04917b853b951f825105cf0caa437330a51f8072d62534dd58384b548ee217681a07590acf5e4940e6305124de319dd4cc94b640c9c16e14247181aaf2096a43212a0d6c1062af7b6135266bb843755150055440e5668023170edf93b48a35d828957a0b1074ae93139721d7a531d24f69e8ac5b700c9fc7af55d97ed9cfafd30dbc5ffa0f0ec9281fb22b9583808266a33c8eb52d6805d52a21ef4f85c06d65ffb797563a01353ec45fe0362445ae75e617ec863675395f1866998e142ca52030473e4ea38a0bd64d69451d3b5221f0d5ebead94cea6bcd3046845b9c0229329655b9108f0d6a00bd2390c1dfa9514b203458e0560c148a8c2d1c02bf0b6a00fd387cef9652ff6a06447d51ff3c9d881d060a9f3c58feaddce71c87e847adcec1fd9514a2f80e61280b90154f90151a038d4bae9546fe7e2e3c0b5a5d7ca7d950995027f1a27e1e67b095e36378bcaf480a07ba22f8fc5ddb125b8694d45c12717380a8dbc2ebcd3455139e1bea0f73199ed808080a04d998ac888d4be43e206d3f75cb93a991b796ca6043457c8d01fd4f1a8cceb44a0831642aedd688f9b800db87aad1958a49ac79704caca88bb894f81e603303a5280a03d5a36870349e279a858bac48b5bee92f1602f63e2d4f6a9b6456c740b119cdea0d8ac8a6e841376dc3533d10342fcd7c42d92f4bef9c9985c7bad805bc36fe817a031425a0be2a13899e3749b384d5125ee94a725b4ed514070f6e7c30ae01c4c36a0db39eb088081b94ff409f53bfbbb4d28c7531380d663cd2d919501f1399e25b980a0bfcfcdf1ef30724c35844b54fa36c9fd88ca77a8a5ee99f5b80c3b808e141e92a02eae10705129ad96cbf375e822fa561e561f410c49c40d6e9e1a7e971f79fa7080b853f851808080a0117e2bf07e6d2254f9cc180dba316bdc58d9c24e6ca0237e4788ed44da3969f4a0264b8d079a35b63c53c6c89bab275f37001846eb1e38f12b659f783f38f979dd808080808080808080808080b868f8669d3d9b4e3aab63c3fb6cf2dd2d9c73993478c61d7e302a8a73df13051a15b846f844013ba025386cbdf1d7421366453347800eb906cd79bdb871111f49c3ffe16b970ff672a0328288fd511a7943fadd1f35481d4a1ba8917b1beda4f014997753c31b7f080f";

  let stateRoot =
    "0x58a1f38004693c069ac3cafef7ba83bb1eeacee3e7b08a703172498c206ab470";
  let blockHash =
    "0x9d2c5d8e302b1d8b0dd335cd7a8c95787730f58727c1e7691a53e29953568072";
  let address = "0x34e45Fc2f0BaDB03a680Ec37d5F69eD1a7835aDa";

  before(async function () {
    const JMT = await ethers.getContractFactory("JellyfishMerkleTreeVerifier");
    const jmt = await JMT.deploy();

    const EVMStorageproof = await ethers.getContractFactory(
      "NexusProofManager",
      {
        libraries: {
          JellyfishMerkleTreeVerifier: await jmt.getAddress(),
        },
      }
    );
    nexusProofManager = await EVMStorageproof.deploy(chainId);
  });

  it("verify account", async () => {
    await expect(
      nexusProofManager.verifyAccount(stateRoot, concatenatedProof, address)
    ).to.revertedWith("sfnslf");
  });

  it("verify storage slot", async () => {
    // const storageProof =
    //   "0xf902acb90214f90211a024f4e5ffa94b3001fb73e3bfd39fb7640a468a30b548902a0c965880ceee69cca0ef44006ad012e29f2f6f84d62d797938abe9e91e73c041e9ce9b63896082c20aa0de1526f1e26601461354bc019d782fda338d8b7d8cd55589cfb64f7d8ff3c61aa07eadbccfc90bad60ee9c437a0e9aa1156f607ee36f518e24cc2941788bf334bda07324efcd607bd4bc4249d4a8789bec5fae1897da1929f50442854388cc6583bba0d0715714e79f9ba1b2b996e8dc923c3aca95235cad466253c075751d14470314a038a46e3b719e5f68dc064284fc61f95c7f9037bd0c626230e5cdbe9b441b1009a082089afd1e8dbfca0d3ce8e9e02e42020ac3be7982dc0d7d284bc695a965a1f5a042242423d954b8abbb9fedd62669c8e229dffe2163635d7c4df1d91d5a014d37a04095129dbdf3627cf05a6e620de19c33d4374087b19736fc856b484803bdbf64a00fb59725f4cdb9611b6bfb2294c9cd559fbfdbc59d5094c336f8c0a09d185adba02c41497d353cb12c087d628968988c2a5438d05fc2029a506330cafa38874175a093d74dbfa3c6faa3f3d5c65297b6574620fc3acc219f94f518159872cd6b3d10a069f24aeaa409c25d75925495adc0b4b63a7d62c5bd1a715be03f6c0a459735fca0769de1662585a0783efe7f9141fc6f2f4f6bcf1b6aaa23fd7c7938dfdf4069c5a0441b90f418eff0131c355547f210a54bd6d5d09cb085916a2ef9bf5e409624cb80b893f8918080a02454c9165876e9c1a7f3d68c4daf6b1e3db079127141c649f20a4e3476e272a38080808080a088c7378063709d2334f7ee44c466d86a8e39660470fb9246832b97e1f518b306808080a0444a7d6b79538290a698d07624735cfbe25a3b8086ba7af81c150885e56e0f248080a044b551f22d0807fd903206f36fbcee148a891da4b1524492968ab0249a211c3080";
    // const storgeAccount = "0x34e45Fc2f0BaDB03a680Ec37d5F69eD1a7835aDa";
    // const storageHash =
    //   "0xa75e7818eb262faed5d29cc53f01aab00877c5d3d8a4b52aff26c5dc0616edfe";
    // const storageSlot =
    //   "0xfb34942ebc6f77e2a4779d58cebad9f418cb83cee5ae5135ce8e901b843c3496";
    // await expect(
    //   nexusProofManager.verifyStorage(storageHash, storageSlot, storageProof)
    // ).to.revertedWith("SFDsjknfskj");
  });

  // it("Pass: updateNexusBlock()", async () => {
  //   await nexusProofManager.updateNexusBlock(11, { stateRoot, blockHash });
  //   expect(await nexusProofManager.latestNexusBlockNumber()).to.equal(11);
  //   const nexusBlockStored = await nexusProofManager.nexusBlock(11);
  //   expect(nexusBlockStored[0]).to.equal(stateRoot);
  //   expect(nexusBlockStored[1]).to.equal(blockHash);
  // });
  // it("Pass: updateChainState()", async () => {
  //   await nexusProofManager.updateChainState(
  //     11,
  //     [],
  //     ethers.zeroPadValue("0x1011", 32),
  //     {
  //       statementDigest: ethers.ZeroHash,
  //       stateRoot: stateRoot,
  //       startNexusHash: ethers.ZeroHash,
  //       lastProofHeight: 11,
  //       height: 111,
  //     }
  //   );
  //   expect(
  //     await nexusProofManager.chainIdToLatestBlockNumber(
  //       ethers.zeroPadValue("0x1011", 32)
  //     )
  //   ).to.equal(111);
  //   expect(
  //     await nexusProofManager.getChainState(
  //       0,
  //       ethers.zeroPadValue("0x1011", 32)
  //     )
  //   ).to.equal(stateRoot);
  // });

  it("Pass: updateChainState()", async () => {
    const req = await axios.get(
      "http://127.0.0.1:7000/account?app_account_id=688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26"
    );

    await nexusProofManager.updateNexusBlock(11, {
      stateRoot: "0x" + req.data.nexus_state_root_hex,
      blockHash,
    });

    let byteArray = req.data.account.statement
      .map((num) => num.toString(16).padStart(8, "0"))
      .join("");

    const tx = await nexusProofManager.updateChainState(
      11,
      req.data.proof,
      "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26",
      {
        statementDigest: "0x" + byteArray,
        stateRoot:
          "0x" +
          Array.from(req.data.account.state_root)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(""),
        startNexusHash:
          "0x" +
          Array.from(req.data.account.start_nexus_hash)
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(""),
        lastProofHeight: req.data.account.last_proof_height,
        height: req.data.account.height,
      }
    );
    console.log(tx);
    expect(
      await nexusProofManager.chainIdToLatestBlockNumber(
        "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26"
      )
    ).to.equal(req.data.account.height);
    expect(
      await nexusProofManager.getChainState(
        0,
        "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26"
      )
    ).to.equal(
      "0x" +
        Array.from(req.data.account.state_root)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
    );
  });
});
