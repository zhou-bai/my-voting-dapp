const { expect } = require("chai");
const { ethers } = require("hardhat");

// 部署后的合约地址（替换为你的实际地址）
const DEPLOYED_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

describe("Existing EncryptedVoting Contract", function () {
  let voting;
  let admin, voter1;

  // 连接到已部署的合约
  before(async function () {
    [admin, voter1] = await ethers.getSigners();

    // 获取已部署合约实例
    voting = await ethers.getContractAt("EncryptedVoting", DEPLOYED_ADDRESS);

    // 确保连接成功
    console.log("Connected to contract at:", voting.address);
  });

  // 测试 1: 验证合约基本信息
  it("应该正确读取部署参数", async () => {
    expect(await voting.admin()).to.equal(admin.address);
    expect(await voting.p()).to.equal(7919); // 需与实际部署参数一致
  });

  // 测试 2: 执行白名单操作
  it("允许管理员添加新白名单", async () => {
    const newVoter = ethers.Wallet.createRandom().address;

    await voting.connect(admin).addToWhitelist(newVoter);
    expect(await voting.whitelist(newVoter)).to.be.true;
  });

  // 测试 3: 进行加密投票
  // 修改后的测试代码（保持ethers v5兼容）
  // 重点修改测试案例
  it("完成有效的加密投票流程", async () => {
    // 使用硬编码测试参数
    const c1List = [1440, 215, 4259].map((x) => x % 7919);
    const c2List = [4186, 7849, 4828].map((x) => x % 7919);

    // 记录初始区块信息
    const initialBlock = await ethers.provider.getBlock("latest");

    // (1) 执行交易并计时
    const startTime = Date.now();
    const txResponse = await voting.connect(voter1).vote(c1List, c2List);
    const txReceipt = await txResponse.wait();
    const endTime = Date.now();

    // (2) 两种时间计算方式
    // 方式一：使用JavaScript时间戳（实际耗时）
    const jsDuration = endTime - startTime;

    // 方式二：区块链时间差（区块生成时间）
    const finalBlock = await ethers.provider.getBlock(txReceipt.blockNumber);
    const blockchainDuration = finalBlock.timestamp - initialBlock.timestamp;

    // 打印耗时统计
    console.log(`
    投票耗时统计：
    - 本地测量耗时: ${jsDuration}ms
    - 区块链确认时间: ${blockchainDuration}s
    交易Gas使用量: ${txReceipt.gasUsed.toString()}
  `);

    // (3) 添加耗时断言
    expect(jsDuration).to.be.lessThan(5000); // 确保5秒内完成

    // 保持原有验证

    expect(await voting.voters(voter1.address)).to.be.true;
  });

  /***************** 核心工具函数 *****************/

  // 初始化一个测试投票者
  async function initTestVoter() {
    const voter = ethers.Wallet.createRandom().connect(ethers.provider);
    await admin.sendTransaction({
      to: voter.address,
      value: ethers.utils.parseEther("1.0"),
    });
    await voting.connect(admin).addToWhitelist(voter.address);
    return voter;
  }
});
