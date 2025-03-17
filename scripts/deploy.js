// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // 使用字符串表示大数
  const p = "7919";
  const g = "2";
  const candidateCount = 3;

  const Voting = await hre.ethers.getContractFactory("EncryptedVoting");
  const voting = await Voting.deploy(
    candidateCount,
    p,  // 直接传递字符串
    g   // 传递字符串
  );
  await voting.waitForDeployment(); // 等待合约部署完成
  console.log("Contract deployed to:", await voting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
