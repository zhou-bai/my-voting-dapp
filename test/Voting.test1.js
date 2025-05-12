// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("EncryptedVoting 全功能测试套件", function () {
//   let voting;
//   let admin, voter1, voter2;

//   // 部署配置参数
//   const standardParams = {
//     names: ["候选人A", "候选人B"],
//     descs: ["技术专家", "产品经理"],
//     p: 7919,
//     g: 7,
//     whitelist: [],
//   };

//   before(async () => {
//     [admin, voter1, voter2] = await ethers.getSigners();
//     standardParams.whitelist = [admin.address, voter1.address];
//   });

//   /***************** 部署功能测试 *****************/
//   describe("合约部署功能", function () {
//     it("应正确初始化参数", async () => {
//       const Voting = await ethers.getContractFactory("EncryptedVoting");
//       voting = await Voting.deploy(
//         standardParams.names,
//         standardParams.descs,
//         standardParams.p,
//         standardParams.g,
//         standardParams.whitelist
//       );

//       // 验证不可变参数
//       expect(await voting.admin()).to.equal(admin.address);
//       expect(await voting.p()).to.equal(standardParams.p);
//       expect(await voting.g()).to.equal(standardParams.g);

//       // 验证候选人初始化
//       const candidateCount = await voting.getCandidateCount();
//       expect(candidateCount).to.equal(standardParams.names.length);

//       const [name1] = await voting.getCandidateInfo(0);
//       expect(name1).to.equal(standardParams.names[0]);

//       // 验证白名单初始化
//       expect(await voting.whitelist(admin.address)).to.be.true;
//       expect(await voting.whitelist(voter1.address)).to.be.true;
//     });

//     it("应拒绝无效初始化参数", async () => {
//       const Voting = await ethers.getContractFactory("EncryptedVoting");

//       // 名称和描述长度不匹配
//       await expect(
//         Voting.deploy(
//           ["无效候选人"],
//           ["描述1", "描述2"],
//           standardParams.p,
//           standardParams.g,
//           []
//         )
//       ).to.be.revertedWith("Name and description array mismatch");

//       // 候选人为空数组
//       await expect(
//         Voting.deploy([], [], standardParams.p, standardParams.g, [])
//       ).to.be.revertedWith("At least one candidate required");
//     });
//   });

//   /***************** 白名单功能测试 *****************/
//   describe("白名单管理", function () {
//     beforeEach(async () => {
//       const Voting = await ethers.getContractFactory("EncryptedVoting");
//       voting = await Voting.deploy(
//         standardParams.names,
//         standardParams.descs,
//         standardParams.p,
//         standardParams.g,
//         standardParams.whitelist
//       );
//     });

//     it("管理员可以添加白名单", async () => {
//       await voting.connect(admin).addToWhitelist(voter2.address);
//       expect(await voting.whitelist(voter2.address)).to.be.true;
//     });

//     it("非管理员禁止操作白名单", async () => {
//       await expect(
//         voting.connect(voter1).addToWhitelist(voter2.address)
//       ).to.be.revertedWith("Admin only");
//     });

//     it("可以移除白名单", async () => {
//       await voting.connect(admin).removeFromWhitelist(admin.address);
//       expect(await voting.whitelist(admin.address)).to.be.false;
//     });
//   });

//   /***************** 投票功能测试 *****************/
//   describe("加密投票流程", function () {
//     const testVoteData = {
//       c1List: [1440, 215],
//       c2List: [4186, 7849],
//     };

//     beforeEach(async () => {
//       const Voting = await ethers.getContractFactory("EncryptedVoting");
//       voting = await Voting.deploy(
//         standardParams.names,
//         standardParams.descs,
//         standardParams.p,
//         standardParams.g,
//         [voter1.address]
//       );
//     });

//     it("完成有效投票流程", async () => {
//       // 修正投票数据模运算
//       const modC1 = testVoteData.c1List.map((x) => x % standardParams.p);
//       const modC2 = testVoteData.c2List.map((x) => x % standardParams.p);

//       await expect(voting.connect(voter1).vote(modC1, modC2)).to.emit(
//         voting,
//         "Voted"
//       );

//       // 验证投票状态
//       expect(await voting.voters(voter1.address)).to.be.true;

//       // 验证加密参数更新
//       const [c1] = await voting.getCandidateInfo(0);
//       expect(c1).to.not.equal(1); // 验证初始值已改变
//     });

//     it("禁止重复投票", async () => {
//       await voting
//         .connect(voter1)
//         .vote(testVoteData.c1List, testVoteData.c2List);
//       await expect(
//         voting.connect(voter1).vote(testVoteData.c1List, testVoteData.c2List)
//       ).to.be.revertedWith("Already voted");
//     });

//     it("非白名单禁止投票", async () => {
//       await expect(
//         voting.connect(voter2).vote(testVoteData.c1List, testVoteData.c2List)
//       ).to.be.revertedWith("Not in whitelist");
//     });
//   });

//   /***************** 结果查询测试 *****************/
//   describe("投票结果查询", function () {
//     beforeEach(async () => {
//       const Voting = await ethers.getContractFactory("EncryptedVoting");
//       voting = await Voting.deploy(
//         standardParams.names,
//         standardParams.descs,
//         standardParams.p,
//         standardParams.g,
//         [voter1.address]
//       );
//     });

//     it("在投票结束后可查询结果", async () => {
//       // 先进行投票
//       await voting.connect(voter1).vote([1, 1], [1, 1]);

//       // 结束投票
//       await voting.connect(admin).endVoting();

//       const [c1List] = await voting.getResults();
//       expect(c1List.length).to.equal(2);
//     });

//     it("投票未结束禁止查询结果", async () => {
//       await expect(voting.getResults()).to.be.revertedWith("Voting not ended");
//     });
//   });
// });
