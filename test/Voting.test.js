const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EncryptedVoting 完整测试套件", function () {
  let voting;
  let admin, voter1, voter2, voter3;

  // 测试参数配置
  const TEST_PARAMS = {
    names: ["Alice", "Bob", "Charlie"],
    descs: ["Blockchain Developer", "Security Expert", "Project Manager"],
    p: 7919,
    g: 7,
    whitelist: [],
  };

  before(async () => {
    [admin, voter1, voter2, voter3] = await ethers.getSigners();
    TEST_PARAMS.whitelist = [voter1.address, voter2.address];
  });

  /***************** 基础功能测试 *****************/
  describe("合约初始化测试", function () {
    beforeEach(async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(...Object.values(TEST_PARAMS));
    });

    it("正确初始化管理员", async () => {
      expect(await voting.admin()).to.equal(admin.address);
    });

    it("正确设置密码学参数", async () => {
      expect(await voting.p()).to.equal(TEST_PARAMS.p);
      expect(await voting.g()).to.equal(TEST_PARAMS.g);
    });

    it("正确初始化候选人", async () => {
      const count = await voting.getCandidateCount();
      expect(count).to.equal(TEST_PARAMS.names.length);

      for (let i = 0; i < count; i++) {
        const [name, desc] = await voting.getCandidateInfo(i);
        expect(name).to.equal(TEST_PARAMS.names[i]);
        expect(desc).to.equal(TEST_PARAMS.descs[i]);
      }
    });

    it("正确初始化白名单", async () => {
      for (const addr of TEST_PARAMS.whitelist) {
        expect(await voting.whitelist(addr)).to.be.true;
      }
    });
  });

  /***************** 投票功能测试 *****************/
  describe("投票功能测试", function () {
    beforeEach(async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(...Object.values(TEST_PARAMS));
    });

    it("白名单用户成功投票", async () => {
      const c1List = [500, 600, 700];
      const c2List = [800, 900, 1000];
      const start = Date.now();
      const tx = await voting.connect(voter1).vote(c1List, c2List);
      const receipt = await tx.wait();
      const duration = Date.now() - start;

      console.log(`首次投票Gas消耗: ${receipt.gasUsed}`);
      console.log(`操作耗时: ${duration}ms`);

      // 验证投票状态
      expect(await voting.voters(voter1.address)).to.be.true;

      // 验证候选人数据更新
      for (let i = 0; i < TEST_PARAMS.names.length; i++) {
        const [, , c1, c2] = await voting.getCandidateInfo(i);
        expect(c1).to.equal(c1List[i] % TEST_PARAMS.p);
        expect(c2).to.equal(c2List[i] % TEST_PARAMS.p);
      }
    });

    it("非白名单用户投票应失败", async () => {
      await expect(
        voting.connect(voter3).vote([1, 1, 1], [1, 1, 1])
      ).to.be.revertedWith("Not in whitelist");
    });

    it("重复投票应失败", async () => {
      await voting.connect(voter1).vote([1, 1, 1], [1, 1, 1]);
      await expect(
        voting.connect(voter1).vote([2, 2, 2], [2, 2, 2])
      ).to.be.revertedWith("Already voted");
    });

    it("投票结束后禁止投票", async () => {
      await voting.connect(admin).endVoting();
      await expect(
        voting.connect(voter1).vote([1, 1, 1], [1, 1, 1])
      ).to.be.revertedWith("Voting ended");
    });
  });

  /***************** 白名单管理测试 *****************/
  describe("白名单管理测试", function () {
    beforeEach(async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(
        TEST_PARAMS.names,
        TEST_PARAMS.descs,
        TEST_PARAMS.p,
        TEST_PARAMS.g,
        []
      );
    });

    it("管理员添加白名单", async () => {
      const start = Date.now();
      const tx = await voting.connect(admin).addToWhitelist(voter1.address);
      const receipt = await tx.wait();
      const duration = Date.now() - start;

      console.log(`添加白名单Gas消耗: ${receipt.gasUsed}`);
      console.log(`操作耗时: ${duration}ms`);

      expect(await voting.whitelist(voter1.address)).to.be.true;
    });

    it("非管理员添加白名单应失败", async () => {
      await expect(
        voting.connect(voter1).addToWhitelist(voter2.address)
      ).to.be.revertedWith("Admin only");
    });

    it("移除白名单", async () => {
      await voting.connect(admin).addToWhitelist(voter1.address);
      const tx = await voting
        .connect(admin)
        .removeFromWhitelist(voter1.address);
      const receipt = await tx.wait();

      console.log(`移除白名单Gas消耗: ${receipt.gasUsed}`);
      expect(await voting.whitelist(voter1.address)).to.be.false;
    });
  });

  /***************** 治理功能测试 *****************/
  describe("治理功能测试", function () {
    beforeEach(async () => {
      const Voting = await ethers.getContractFactory("EncryptedVoting");
      voting = await Voting.deploy(...Object.values(TEST_PARAMS));
    });

    it("创建提案", async () => {
      const start = Date.now();
      const tx = await voting.connect(admin).createProposal("Upgrade contract");
      const receipt = await tx.wait();
      const duration = Date.now() - start;

      console.log(`创建提案Gas消耗: ${receipt.gasUsed}`);
      console.log(`操作耗时: ${duration}ms`);

      expect(await voting.getProposalCount()).to.equal(1);
    });

    it("未达票数执行应失败", async () => {
      await voting.connect(admin).createProposal("Test proposal");
      await expect(voting.connect(admin).executeProposal(0)).to.be.revertedWith(
        "Not enough votes"
      );
    });
  });
});
