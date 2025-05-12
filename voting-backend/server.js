// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { VotingCrypto } = require("./ElGamal");
const { encrypt, decrypt } = require("./secureStorage");
const axios = require("axios");

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
    //console.log("使用的加密密钥:", process.env.KEY_ENCRYPTION_SECRET);

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
    //console.log("使用的私钥:", privateKey);

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

// DeepSeek对话端点
app.post("/api/ai-chat", async (req, res) => {
  try {
    // 验证请求数据
    if (!req.body.message || typeof req.body.message !== "string") {
      return res.status(400).json({ error: "无效的请求格式" });
    }

    // 验证API密钥
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("未配置DeepSeek API密钥");
    }

    // 构建消息历史（支持多轮对话）
    const messages = [
      {
        role: "system",
        content: `你是一个专业的区块链投票系统助手，具备以下知识：
        1. 熟悉零知识证明和ElGamal加密机制
        2. 精通智能合约开发和权限管理
        3. 能用简洁的中文回答技术问题`,
      },
      {
        role: "user",
        content: req.body.message,
      },
    ];

    // 调用DeepSeek API
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        timeout: 10000, // 10秒超时
      }
    );

    // 提取有效回复
    const aiReply = response.data.choices[0].message.content;

    // 记录日志（生产环境需调整日志级别）
    console.log("[AI对话] 用户问题:", req.body.message);
    console.log("[AI回复]", aiReply);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("AI对话错误:", error.response?.data || error.message);

    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error?.message ||
      (statusCode === 401 ? "无效的API密钥" : "AI服务暂时不可用");

    res.status(statusCode).json({
      error: errorMessage,
      code: statusCode,
    });
  }
});
