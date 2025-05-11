// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { VotingCrypto } = require("./ElGamal");
const { encrypt, decrypt } = require("./secureStorage");

const app = express();
app.use(cors());
app.use(express.json());

// 初始化加密参数（应与合约一致）
const CRYPTO_PARAMS = {
  p: 7919, //
  g: 2,
};

// 安全存储密钥（示例使用加密内存存储）
let secureKeyStorage = null;

if (!process.env.KEY_ENCRYPTION_SECRET) {
  console.error("致命错误：未找到 KEY_ENCRYPTION_SECRET 环境变量");
  console.log("当前环境变量：", process.env);
  process.exit(1);
}

//测试
app.post("/api/keys/test", (req, res) => {
  const crypto = new VotingCrypto(CRYPTO_PARAMS.p, CRYPTO_PARAMS.g);
  const privateKey = decrypt(
    secureKeyStorage.encryptedPrivateKey,
    process.env.KEY_ENCRYPTION_SECRET
  );

  // 测试加密/解密
  const testVote = 1; // 模拟给候选人1投1票
  const encrypted = crypto.encryptVote([testVote], secureKeyStorage.publicKey);
  const decrypted = crypto.decrypt(
    encrypted[0].c1,
    encrypted[0].c2,
    privateKey
  );

  res.json({
    publicKey: secureKeyStorage.publicKey,
    privateKey: privateKey,
    testVote: testVote,
    encrypted: encrypted,
    decrypted: decrypted,
  });
});

// 密钥生成端点（首次启动时调用）
app.post("/api/keys/init", async (req, res) => {
  try {
    // 添加密钥存在性检查
    if (secureKeyStorage) {
      return res.status(400).json({ error: "密钥已存在，请先销毁旧密钥" });
    }

    const crypto = new VotingCrypto(CRYPTO_PARAMS.p, CRYPTO_PARAMS.g);
    const keyPair = crypto.generateKeyPair();

    // 显式验证密钥有效性
    console.log("生成私钥");
    console.log("使用的加密密钥:", process.env.KEY_ENCRYPTION_SECRET);

    const encryptedPrivKey = encrypt(
      keyPair.privateKey.toString(), // 确保转换为字符串
      process.env.KEY_ENCRYPTION_SECRET
    );

    secureKeyStorage = {
      publicKey: keyPair.publicKey,
      encryptedPrivateKey: encryptedPrivKey,
    };

    res.json({
      publicKey: secureKeyStorage.publicKey,
      encryptedPrivateKey: secureKeyStorage.encryptedPrivateKey,
    });
  } catch (error) {
    console.error("初始化错误详情:", error.stack);
    res.status(500).json({ error: error.message });
  }
});

// 解密端点
app.post("/api/decrypt", async (req, res) => {
  try {
    // 添加请求数据验证
    if (!req.body.c1List || !req.body.c2List) {
      return res.status(400).json({ error: "Missing cipher data" });
    }

    // 确保数据为数字数组
    const c1List = req.body.c1List.map(Number);
    const c2List = req.body.c2List.map(Number);

    // 添加解密日志
    console.log("解密请求数据:", { c1List, c2List });

    // 解密私钥
    const privateKey = decrypt(
      secureKeyStorage.encryptedPrivateKey,
      process.env.KEY_ENCRYPTION_SECRET
    );
    console.log("使用的私钥:", privateKey);

    // 执行解密
    const crypto = new VotingCrypto(CRYPTO_PARAMS.p, CRYPTO_PARAMS.g);

    const results = c1List.map((c1, i) => {
      try {
        return crypto.decrypt(c1, c2List[i], privateKey);
      } catch (error) {
        console.error(`候选人 ${i + 1} 解密失败:`, error);
        return -1; // 错误标记
      }
    });

    res.json({ results });
  } catch (error) {
    console.error("完整解密错误:", error.stack);
    res.status(500).json({ error: error.message });
  }
});

// 获取公钥端点
app.get("/api/public-key", (req, res) => {
  res.json({ publicKey: secureKeyStorage?.publicKey });
});

app.listen(3001, () => {
  console.log("Key Management Service running on port 3001");
});
