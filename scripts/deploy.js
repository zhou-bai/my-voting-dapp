const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // 系统参数（与实际前端保持一致）
  const p = 7919;
  const g = 2;
  const candidateCount = 3;

  const Voting = await ethers.getContractFactory("EncryptedVoting");
  const voting = await Voting.deploy(candidateCount, p, g);
  
  console.log("Contract deployed to:", voting.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
