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
    "0xf90d31b90214f90211a0dbd2df11b0303b3a53205d70be95529bc5ef299c61beccf610c1aa53220ecac4a08c871174619f4695761b163273dc35ec3ea19b33b2bffa251146f32de85b5740a016a4c9c4eecaa89d8100b797531c274890a313a6280e47ce2f119d68cb501e10a0df3ec9c8af56aa0f5c56d245ac6296fa2f7dd1827494456744550069fe6bb9b6a000dc11f8b885478ad088fc0462411a777d29cadfbab5beb18ef3e4b23cc39d66a0dfee89d572fab40785c142fbac7df6099338bada129a24c9b5c5687905595f83a0a40f41ec9de9cb015c85699568051aee759417e390ecb4ea20feba43fb8be17aa035cce7934251008ec06fc89ec4fa35f10d6458d6e3ab2ddd968d2530cfc950a5a0d83cd5ef5640912c9a19d0b504d3c7b972fe470182ad886ff17c80072b107950a0d33757cfdde890cf99fbf88410ff73069b2455c59191c1e1b9b602d5af963387a02c255024a1055a42774b73ceb0faa6fa3bf65100b7450abdb2354baccd31d82da001ea156dbab03bf5937fddb49503d53220f2e3bf654eee4ee2fb7d10549ab017a00d55dc6e197d2d18b133d36ed4767747891dfc7edf91ed80b602862003ffdb30a00332e84d61b7ad47caf30ebdc8b0c4fba24c2297173a2da043f0bd4e37ee94d9a0ced0c0379ff5b59e8edca602de8a1fbae2c26793072b0985972139bf93176f06a06035e931539ecabcef73d9dead190b727e8919d2960b38800b8f4b6ce855829980b90214f90211a03cf0b699206cac863ce73e0e2c734f71d31341adfddb2d0a0a984e7f89fc651ea039860498b86bb0ed4f5a59dd1bcab0e31a8cc52c57921077aa129ecebc572d4aa0431119dbf6882d86b0b653c9ffdec9ee1fa9335e594dbdf956c196aa422d7740a0ee08e6e565777308de5124f00394d60059d7b4ce4625de3b788a559d23d5a69ca05a315820bbbe24fa011e4e80c0ba92544a67d1a185bbc59189ff73e3ef172b67a01e977c203c685c1e0a2f188f03838c216852a2bc17dcacc6f6173aad47cc7410a0e2e4926959414e462ca4a815b3815f629d5d739b1e5a8649c2d2be0de4b18ceca012a5e705838b4751da4926f77300ef7cc6c4fbcd838c6985ace9f5201293f0cfa0e2862029d00302932570e50d20023b9b2f8ff54b366b80b67019f7abfe285d29a08b9f942593e26f7f1f0a78f7342f2f6b35598e3e398b6ba46759e4f30a196ad4a07e3e581a6ef4bae5997045c7aa24056a3783bf8b0e70a7af9f9136adfa34b3e3a03013a8db9865d3632357390e1003818ab7f527a557f7d396d1e29e405ea0f9f3a037743eec0e9dc9b8c77c5af60cbe620b6cdc63ca5f76a3a848411ac019d9ec68a08049e8c5e164fc63fc43cedcd70d4d692fc410affbaa1ba1a687f4bf2bfd3e3da09eab251f8a11adbec163b39bc093687fd29a8e668d481cb78cf336e2882b3c34a016fd13f23f0fa68a981fb0272f8349d671f7ee55ed3ec64935576062b04869c880b90214f90211a0fd3d01bfc02a11bc80d73876e92ea0a4a2238412e90009ed2594b40e7ceea27ca01d9c328a11efc74bdd6bd6d0a0f3fd1a10ed54856e859ecca278478144cd2c54a0e94ffe39b8f85a68c50fe174f7061197190e614500549611729a5edc5f6e3aeda065e0449e8e321d3d4b83ce9d799140b9dd3c67bb8c6aff04768984ff93bb7abfa02ba7e16e2bdbe12bcefa5966058ab05a5fdd1ab2d3197fc365f9ce9cc7c859b8a083cefc3dfcde4c01a1aaca64bb7bbfa856f09cc95905d752f7e4e7f846e7083fa0f2c20b73aa26f15c573061f4ccb217ac1b7844244109822bd34d547e2d9028f8a019914918986a73a7261149705beb8cdd723f7e049003534e8329ad89d7bc1daca0ade5558396b2d860753913d46b03d55cf4845b622935b9ec963a516ebbccd091a01fc6aafeb2ed75677a324109ebd781be900a9e40cf62ad6e8285a29dfaa59ce2a0656914941631750c2c6dc4b500f798e2d43b2646c67ba35f0bbb0e4c73dd0b01a05c7eef7f3f184ca5a7bc996eb09928d1529308bdf522365b6568a1d4d1bd4001a07abdc31ebc340ff768cb460bb6a709e0c733546954b5bc43b414d8dc399cd009a0f2656bf12c4e4963cbdfa3793ca936223ed8c5fc2a895fc9ae5f1d5b9012e167a08fd038e8002c7eacfc141ceeb5e71dda43961ab633ec95d67292a5d1220a6fb3a0f53b8cbfe22a7fcfc25f05b45a42648792759bef8a72ff0f621d657b4322eece80b90214f90211a04eb7a025da95d5bb59475ebb9dc71915a9a5a565daa126933974205fa3b8c658a05b3e276cd9444b865f0fd7f58068c9c05c537fa40ecb1e55562515c036f910a5a033cc2d54ceea4a8a1fab00ca0fee88682e202bd5100f7417e3c4b8dde8ab0c5ea09e07b8fa0bf1d70ce32414cadafd9ba26d880da6efbc290a152092209b1a34d4a08749260105f14a9abd0286a980b647666b0d293a700bfca9fdf5cb164f055f2da098bc6149343ae429cb8db780f7450d1a83919e58fb26a5a667b1ea0a7e53f3b8a0f81b2e9e33f9ee00ad34727f73b31feb34146dc162feeb896f9adcdc0be6816fa04fee93d808b2e9b32b4ce32895f302c6a0d74b4c43e1005157b4a316efb3209da01b323b563cc4b5e41f187a2fd529866d9bd0d93f813ed93bd97d24f7e87bddd1a02701d1915078f4f3d000986164b8a0f26dc1763cd03b150ed341187fee03baa7a05918c5070d6c88df6dfc64ae5d6290c1b7fd24676c72c9bc007bdec884b21db2a0fd05ba13e395c8d4bdaa2b12430db00f127b0b6b0495fb156f41e3ff686e06f7a0e19cc6fd9a9c4bdde21ecfdb816326a6af437b5b83e5ce8ea1a80ffe03411947a0f48c6c4dae8c0e882959165f3d09884bd396a604d905239b88ed862808d25e3ba0ca9c1dae235de2beb186c2c2abd381e7a66dc0c57321bd6a9bdd26251a9ddef9a0e3b0033182456951e44209737f3d31ddb53db4cb892eede67da80eb39ee6752b80b90214f90211a032df6df55cd1a799e666a2bdef8524ac764607ac0fa584f005c818037f1d2a56a0b62af18e27e4446fc025945c91b636880594e4913f1ac72c67590766cbc55f0fa055ed7a55040bdedf3c14bb05934752e31055dc28036abaf6bb9e2b43db11f4efa0741f6adbe295d677d9ad4a952a9ed3b96c5e595aabb5815f36491485257bd862a006db05492832405630eff0400c080facc85302fc29f2ec8f620c45ff81d0acbfa0f4502ba5b0bc0d6606c2d53829643381a5cdcf008a346ec01925890c99f90058a0c98e0a3a2303e5e1a98075683b4a31d2d40007051d09c1bf412a7417323d5afba0f02dffdd13327a840f0979ab88a1915bcc58f3e0756dd6c755f59dd6c38e2453a0911d4e3f795bb3cd7852c99fa0772395215c08c65f3b2d32a4c19915d8a19339a09d2414f694678537f7a8d1f9b8e3317d0fa15ad3aee20d85f355f64843698ec4a0ae7fcae087ff4c9f2fc81a884d04a43df9153f5dfff4cf9affe29ce8a5f91d33a0b8f9abb21e80ccd9f77caddccac77eea0deb82cfc746ec3a80f685c72d58b373a02bf98780df426042270946fc3ee373b1844b16b95660cb84595de9edec3a67a5a069234abb5187bc78de833605ac601238ea9a5c547e717de164a36312dbcfa00ca09b8ffa4b32d86ab28388fe0334f509e0cbcfe8516c4c3043c45e07ede533783fa0e3f4b0498c5be4a156da4ac974513795c4d717b7f7aea3f6d1d2839f641125bc80b901b4f901b1a0fbb9a053e8c5c27351b63b1d21fe14626530a4d52139be97152d545fdce024bda07931f2853e2fe97b9b3355d9e66c9d3ac4421341904a6a32e6b4f1ada4e0a443a0556a9fc21790adc326d1d0fd2ecf79e0e10b3cdfb704e3357a20c776ad3bd142a0ec83f6d3dd5e2ee689d8bfdf23685704943b3c7ea848a27348347f749e6877e7a07175c3dc9c0b2dc4a079f015aeb7b2230d7f0a3e57405153f046d52f52ce963ba0ab2703c7c04f602d7775054a044e978fe9c3002bfa856a524a9bf0d37eaad20aa0b8aa359f1578d5e404a37f010bf90090393fce261568f91b704d2932267d10208080a04dfbcd4ce8a4a95383536b61d977bbcd2e6233cd51fb2c0cbaf39a6e39862421a0e0fa04615b9947fee901a15562839e931e0b7f0da75c6bf772146affbc57459b80a0c828a736488fde48fe621b2c6f49657cae185cffb5b9a5ab5ae2c8d7850ff961a0ab49036bd28435fadda0c4cce7a264b820bd18ca509345931b918ac93079e659a09260b603b6f36eab2e8b4a0542c23c848b6728e37f32a7630b71f097dd854f91a0ff55648468fc7d636a0d6f451aecc2d02871c5b41ca54f438a478c3d01de395a80b893f891a0a65665d74790efb26ba3c041a652f3bf74935e4aa389aa23c3f9a8dcdd1dbe0ca017f0018bb51993fd98b86b424c4d5c41c70ce5fdecabfef85320c1e05b51c2258080a0d1953bb57ef194397a6249e45b71de69f65ae7d133e4094e09b06f8aa5f610d180808080808080a0e3c10388c2441dee39ece261f1cf3bb3d28383c7219c8b7d128808fb611d18c780808080b870f86e9d3e6b3739405336fdba54c7343ce5c67b57bf832eca8cafdfb497db78bbb84ef84c12880438f8cfd3bf97b6a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a0c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
  let stateRoot =
    "0x9d2c5d8e302b1d8b0dd335cd7a8c95787730f58727c1e7691a53e29953568072";
  let blockHash =
    "0x9d2c5d8e302b1d8b0dd335cd7a8c95787730f58727c1e7691a53e29953568072";
  let address = "0x3073F6Cd5799d754Ea93FcF54c53afd802477983";

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
    const tx = await nexusProofManager.verifyAccount(
      stateRoot,
      concatenatedProof,
      address
    );
  });

  it("verify storage slot", async () => {
    const storageProof =
      "0xf9032cb90214f90211a0fa5e2fd2d6e72c8e43b0ecbeb17a319100e1afbbdb29b63a697bcdbd4a76a2c9a06eb6224a9564b438ad325d0488179f5030a4326eef2ed1ac2d7519d4294174aba061ef152c381b12802824b71a91afc98c04a5b6e51d389fb9f2c05e5abe31b3e5a04e89079af75d215b6bc8b9da9d4004924c10f630376ad15c0a38aca26f72181aa041546186685e7844b9eb3e9aae302edd9e4bea2623126f7b6d1c960eb40c011ca0edd7174916748bfa8745eb7c7ae6d918407122e59528613c45378c4fb2ce754fa0fbcd97095a84dca96a677c8cecc8c896dc30873b04f26c75e9c178d0ca37e6aca0e0c78dc9d094e0862de0a5c9c985baf6559e2c40bec51992680b214bc6bb4f35a057ff5978a35d5ec99f026666883f5f027fde694459680ec6e57fc298e2e98186a0c9d21353484f8b32ef324257ad91a3ec3c38a7b8406e8a4f8ee4df36db357af9a0e6d922b0ba239623bb6e760dca22188040f4cc5a0ec67956f7a150caf572c960a0e8d15b5addd823945cf6fc4bfbbad157509404495f1837252b0ee02218968373a0d3296997569db72f2d654f637d919044d60780c9dd0b0991cfa7643d342a3923a0829e3a88a6375481ab9af6f12a2aacf1ce623d271db7aee004d554a0614429aaa0e1fbeb68483387d5bc0b5c55ed390b8fe3eeb317e1529ccaa9c7a41f0446d7a4a079f4c602db086d596a7a47dbcaaa6a0d6e75f1ccc8165907610e76c93abfbfe580b893f891a09f74f37bdf07e2d73e875c821a01a72ec9e3e5362cddcfa3521296476e6da1f880808080a038d9d8c71f2ce4639e7da19dc4c9d007e8b899611eea89b30c58963958b9e1a08080a0c50af823ddd4cfc519ce820f15c121ca41cdebf06b1c3ef90f864120f4aefc468080808080a0eb10e85ce708885e53342a886ef11efbe1d3594a12fa790df637d075eac860b18080b853f8518080808080a06faf57464a2fd95b0ab5ca730e0bcb746ddf4998391c1f0c25a1c7aecd71b4c8808080808080808080a070498144d3ce4caf58f156fda7f3056e5cb58bfca06621a384d441c6c691a2ae80aae99f3787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace88872386f26fc10000";
    const storgeAccount = "0xd35CCeEAD182dcee0F148EbaC9447DA2c4D449c4";
    const storageHash =
      "0xed339d10818912537ecff9846d024bbb91f43c025e0cf6bd9776170b11a77233";
    const storageSlot =
      "0x0000000000000000000000000000000000000000000000000000000000000002";

    await expect(
      nexusProofManager.verifyStorage(storageHash, storageSlot, storageProof)
    ).to.not.reverted;
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
