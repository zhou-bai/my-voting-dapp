const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EncryptedVoting 性能测试套件", function () {
  let voting;
  let admin, voter1, voter2;

  // Gas消耗参考基准
  const EXPECTED_GAS = {
    DEPLOY_BASE: 1_500_000, // 部署基础消耗
    VOTE_BASE: 150_000,
    WHITELIST_ADD: 50_000,
  };

  // 部署配置
  const standardParams = {
    names: ["CandidateA", "CandidateB"],
    descs: ["Technical Expert", "Product Manager"],
    p: 7919,
    g: 7,
    whitelist: [],
  };

  before(async () => {
    [admin, voter1, voter2] = await ethers.getSigners();
    standardParams.whitelist = [voter1.address];
  });

  /***************** Gas消耗测试 *****************/
  describe("Gas消耗基准测试", function () {
    it("单个投票操作消耗", async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(...Object.values(standardParams));

      const start = Date.now();
      const tx = await voting.connect(voter1).vote([500, 600], [700, 800]);
      const receipt = await tx.wait();
      const duration = Date.now() - start;

      console.log(`⏱️ 投票耗时: ${duration}ms`);
      console.log(`⛽ 投票Gas消耗: ${receipt.gasUsed}`);

      expect(receipt.gasUsed).to.be.lessThan(EXPECTED_GAS.VOTE_BASE);
      expect(duration).to.be.lessThan(5000); // 5秒超时保护
    });

    it("白名单操作消耗", async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(...Object.values(standardParams));

      // 测试空操作的Gas消耗
      const tx = await voting.addToWhitelist(voter2.address);
      const receipt = await tx.wait();

      console.log(`🛂 添加白名单消耗: ${receipt.gasUsed}`);
      expect(receipt.gasUsed).to.be.lessThan(EXPECTED_GAS.WHITELIST_ADD);
    });
  });
  /***************** 时间性能测试 *****************/
  describe("操作时效性测试", function () {
    // 每次创建新合约实例
    beforeEach(async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(
        standardParams.names,
        standardParams.descs,
        standardParams.p,
        standardParams.g,
        [] // 清空白名单初始化
      );
    });
    it("白名单操作响应时间", async () => {
      // 使用未初始化的地址
      const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

      const start = Date.now();
      const tx = await voting.addToWhitelist(testAddress);
      await tx.wait();
      const duration = Date.now() - start;

      console.log(`⚡ 白名单操作耗时: ${duration}ms`);
      expect(duration).to.be.lessThan(2000);
    });
  });
});
