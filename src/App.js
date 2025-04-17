import { useState, useEffect, useCallback } from "react";
import { VotingCrypto } from "./ElGamal";
import { BrowserProvider, Contract, ethers } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";
import { Chart as ChartJS } from "chart.js/auto";
import { Bar } from "react-chartjs-2";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Logs from "./Logs";
import Candidates from "./Candidates";

function App() {
  const [contract, setContract] = useState(null); // 合约实例
  const [candidates] = useState(3); // 候选人数量
  const [selected, setSelected] = useState(0); // 用户选择的候选人
  const [results, setResults] = useState([]); // 解密后的投票结果
  const [votingEnded, setVotingEnded] = useState(false); // 投票结束状态
  const [currentAccount, setCurrentAccount] = useState(""); // 当前连接账户
  const [decrypting, setDecrypting] = useState(false);

  const [publicKey, setPublicKey] = useState(null);

  // 新增状态管理
  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [adminAddress, setAdminAddress] = useState(
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );
  const [whitelist, setWhitelist] = useState([]);

  const [ethBalance, setEthBalance] = useState("0");
  const [networkInfo, setNetworkInfo] = useState("");

  const [showHelp, setShowHelp] = useState(false);

  const [darkMode, setDarkMode] = useState(false);

  const [showDeploy, setShowDeploy] = useState(false);
  const [showWhitelist, setShowWhitelist] = useState(false);

  //白名单查询
  const [searchTerm, setSearchTerm] = useState("");

  //  管理员密钥对（开发演示用，实际应安全存储）
  //  const [adminKey] = useState(() => {
  //    const crypto = new VotingCrypto();
  //    return crypto.generateKeyPair();
  //  });

  //部署合约
  const [voteCount, setVoteCount] = useState("");
  const [generatedWhitelist, setGeneratedWhitelist] = useState([]);
  const [deploying, setDeploying] = useState(false);

  const [showManager, setShowManager] = useState(false);

  const PREDEFINED_ADDRESSES = [
    // 确保每个地址已经是校验和格式
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
    "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
    "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
    "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  ];

  // 新增状态
  const [contractAddress, setContractAddress] = useState(() => {
    const saved = localStorage.getItem("contractHistory");
    return saved
      ? JSON.parse(saved)[0]
      : "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  });
  const [savedContracts, setSavedContracts] = useState(() => {
    return JSON.parse(localStorage.getItem("contractHistory")) || [];
  });
  const [newContractInput, setNewContractInput] = useState("");

  const chartData = {
    labels: Array.from({ length: candidates }, (_, i) => `候选人 ${i + 1}`),
    datasets: [
      {
        label: "投票结果",
        data: results.map((r) => (r ? parseInt(r.split(":")[1]) : 0)),
        backgroundColor: "#36a2eb77",
        borderColor: "#36a2eb",
        borderWidth: 1,
      },
    ],
  };

  const connectContract = async (provider) => {
    const signer = await provider.getSigner();
    const contractInstance = new Contract(
      contractAddress, // 使用状态中的地址
      VotingABI.abi,
      signer
    );

    try {
      // 添加合约验证
      const admin = await contractInstance.admin();
      setAdminAddress(admin);
      return contractInstance;
    } catch (e) {
      console.error("合约连接失败:", e);
      return null;
    }
  };

  // 获取白名单列表
  // 使用useCallback封装获取白名单函数
  const fetchWhitelist = useCallback(async () => {
    // if (!contract || !ethers.isAddress(contract.address)) { // 增加地址验证
    //   console.log('contract:',contract);
    //   console.error("合约未正确初始化");
    //   return;
    // }

    const predefined = [
      // 确保每个地址已经是校验和格式
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
      "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
      "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
      "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
      "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
      "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
      "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
      "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
      "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
      "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
      "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    ];

    try {
      const validatedAddresses = predefined.map((addr) => {
        if (!ethers.isAddress(addr)) {
          throw new Error(`非法地址: ${addr}`);
        }
        return ethers.getAddress(addr); // 二次格式校验
      });

      const statusPromises = validatedAddresses.map(async (addr) => {
        try {
          // 使用正确的调用格式
          return await contract.whitelist(addr);
        } catch (e) {
          console.error(`地址 ${addr} 查询失败:`, e);
          return false;
        }
      });

      const results = await Promise.all(statusPromises);
      const activeList = validatedAddresses.filter((_, i) => results[i]);

      setWhitelist(activeList);
      console.log("更新后的白名单:", activeList);
    } catch (error) {
      console.error("白名单更新异常:", error);
    }
  }, [contract]);

  //随机生成白名单函数
  const generateRandomWhitelist = () => {
    const count = parseInt(voteCount);
    if (isNaN(count)) {
      alert("请输入有效的数字");
      return;
    }
    if (count < 1 || count > 19) {
      alert("投票人数必须在1到19之间");
      return;
    }

    const shuffled = [...PREDEFINED_ADDRESSES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    setGeneratedWhitelist([...new Set(selected)]);
  };

  //部署智能合约函数
  const deployNewContract = async () => {
    if (!window.ethereum) {
      alert("请安装MetaMask");
      return;
    }
    if (generatedWhitelist.length === 0) {
      alert("请先生成白名单");
      return;
    }

    setDeploying(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contractFactory = new ethers.ContractFactory(
        VotingABI.abi,
        VotingABI.bytecode,
        signer
      );

      const contract = await contractFactory.deploy(
        3, // 候选人数
        "7919", // p
        "2", // g
        generatedWhitelist
      );

      await contract.waitForDeployment();
      const address = await contract.getAddress();
      // 新增：将合约地址加入列表（防重复）
      const updatedContracts = Array.from(
        new Set([address, ...savedContracts])
      ).slice(0, 10); // 最多保留10条记录

      setSavedContracts(updatedContracts);
      localStorage.setItem("contractHistory", JSON.stringify(updatedContracts));
      setContractAddress(address); // 自动切换到新合约

      // 更新前端状态
      setContract(contract);
      setPublicKey(null);
      setResults([]);
      setVotingEnded(false);

      // 重新获取公钥
      const response = await fetch("http://localhost:3001/api/public-key");
      const data = await response.json();
      setPublicKey(data.publicKey);

      alert(`新合约部署成功！地址：${address}`);
      setGeneratedWhitelist([]);
      setVoteCount("");
    } catch (error) {
      console.error("部署失败:", error);
      alert(`部署失败: ${error.message}`);
    } finally {
      setDeploying(false);
    }
  };

  // 账户切换处理
  const handleSwitchAccount = async () => {
    if (!window.ethereum) return;

    try {
      // 触发MetaMask账户切换
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // 重新初始化合约连接
      const provider = new BrowserProvider(window.ethereum);
      const newContract = await connectContract(provider);

      setContract(newContract);
      setCurrentAccount(accounts[0]);
      alert(`已切换至账户: ${formatAddress(accounts[0])}`);
      // 在合约部署后立即调用（未投票前）
      const candidate = await contract.candidates(0);
      console.log("候选人1初始值:", [
        candidate.c1.toString(),
        candidate.c2.toString(),
      ]);
      for (let i = 0; i < 3; i++) {
        const c = await contract.candidates(i);
        console.log(`候选人${i + 1}:`, c.c1.toString(), c.c2.toString());
      }
    } catch (error) {
      console.error("账户切换失败:", error);
      alert(`错误: ${error.message}`);
    }
  };

  // 地址格式化显示
  const formatAddress = (addr) => {
    if (!addr) return "未连接";
    const lead = addr.slice(0, 6);
    const tail = addr.slice(-4);
    return `${lead}****${tail}`;
  };

  // 新增独立的useEffect处理公钥获取
  useEffect(() => {
    async function fetchPublicKey() {
      try {
        const response = await fetch("http://localhost:3001/api/public-key");

        // 添加响应状态检查
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("获取到的公钥:", data.publicKey);
        setPublicKey(data.publicKey);
      } catch (error) {
        console.error("获取公钥失败:", error);
        alert("公钥获取失败，请检查后端服务运行状态");
      }
    }

    // 仅在首次加载时获取公钥
    fetchPublicKey();
  }, []); // 注意空依赖数组确保只执行一次

  //深色模式
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  // 获取余额和网络信息
  useEffect(() => {
    const provider = new BrowserProvider(window.ethereum);
    const fetchBalance = async () => {
      if (currentAccount) {
        const balance = await provider.getBalance(currentAccount);
        setEthBalance(ethers.formatEther(balance));
      }
    };

    const fetchNetwork = async () => {
      const network = await provider.getNetwork();
      setNetworkInfo(`${network.name} (${network.chainId})`);
    };
    fetchBalance();
    fetchNetwork();
  }, [currentAccount]);

  // 初始化效果（组件挂载时执行）
  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const provider = new BrowserProvider(window.ethereum);

          // 修复点1：必须await获取signer
          const signer = await provider.getSigner();

          // 获取初始账户
          const account = await signer.getAddress();
          setCurrentAccount(account);

          // 建立合约连接
          const votingContract = await connectContract(provider);
          setContract(votingContract);

          // 添加账户变化监听
          window.ethereum.on("accountsChanged", async (accounts) => {
            if (accounts.length === 0) {
              console.log("请连接钱包");
              setCurrentAccount("");
            } else {
              const newContract = await connectContract(
                new BrowserProvider(window.ethereum)
              );
              setContract(newContract);
              setCurrentAccount(accounts[0]);
            }
          });
        } catch (error) {
          console.error("初始化错误:", error);
        }
      }
    }
    init();

    // 组件卸载时移除监听
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  // 初始化效果（现在包含正确的依赖）
  useEffect(() => {
    async function initData() {
      if (contract) {
        // 加载白名单
        await fetchWhitelist(); // 现在可以正常访问
      }
    }

    initData();
  }, [contract, fetchWhitelist]); // 添加函数到依赖项

  // 处理添加白名单
  const handleAddToWhitelist = async () => {
    if (!contract || !isAdmin()) return;
    const address = whitelistAddress;
    if (!ethers.isAddress(address)) {
      alert("请输入有效的以太坊地址");
      return;
    }

    try {
      const tx = await contract.addToWhitelist(whitelistAddress);
      await tx.wait();
      setWhitelistAddress("");
      fetchWhitelist();
      alert("成功添加白名单");
    } catch (error) {
      console.error("添加失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    }
  };

  // 处理移除白名单
  const handleRemoveFromWhitelist = async (address) => {
    if (!contract || !isAdmin()) return;

    try {
      const tx = await contract.removeFromWhitelist(address);
      await tx.wait();
      fetchWhitelist();
      alert("成功移除白名单");
    } catch (error) {
      console.error("移除失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    }
  };

  // 新增删除函数
  const handleDeleteContract = (addressToDelete) => {
    if (savedContracts.length <= 1) {
      alert("至少需要保留一个合约地址");
      return;
    }
    if (window.confirm("确定要删除这个合约地址吗？")) {
      const updated = savedContracts.filter((addr) => addr !== addressToDelete);
      setSavedContracts(updated);
      localStorage.setItem("contractHistory", JSON.stringify(updated));

      // 如果删除的是当前选中的合约，切换到第一个
      if (contractAddress === addressToDelete) {
        setContractAddress(updated[0]);
        setContract(updated[0]);
      }
    }
  };

  // 检查是否是管理员
  const isAdmin = () => {
    return currentAccount.toLowerCase() === adminAddress.toLowerCase();
  };

  //处理投票提交
  const handleVote = async () => {
    if (!contract) return;

    const crypto = new VotingCrypto();
    // 创建投票向量（选中的为1，其他为0）
    const mList = new Array(candidates).fill(0);
    mList[selected] = 1;

    // 加密投票
    const encrypted = crypto.encryptVote(mList, publicKey);
    const c1List = encrypted.map((e) => e.c1);
    const c2List = encrypted.map((e) => e.c2);

    try {
      // 发送交易
      const tx = await contract.vote(c1List, c2List);
      await tx.wait();
      alert("Vote submitted successfully!");
    } catch (error) {
      console.error("Voting failed:", error);
    }
  };

  const calculateResults = async () => {
    setDecrypting(true);
    try {
      // 添加合约状态检查
      const isEnded = await contract.votingEnded.staticCall();
      if (!isEnded) {
        alert("请先结束投票再查看结果");
        return;
      }
      //获取加密结果
      const [c1Results, c2Results] = await contract.getResults();

      // 添加数据验证
      console.log("原始加密数据:", {
        c1Results: c1Results.map((n) => n.toString()),
        c2Results: c2Results.map((n) => n.toString()),
      });
      // 转换BigInt为字符串
      const convertBigIntArray = (arr) => arr.map((item) => item.toString());

      const requestBody = {
        c1List: convertBigIntArray(c1Results),
        c2List: convertBigIntArray(c2Results),
      };

      const response = await fetch("http://localhost:3001/api/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("解密请求失败");

      const data = await response.json();
      const decryptedResults2 = data.results.map(
        (count, i) => `候选人 ${i + 1}: ${count}票`
      );
      setResults(decryptedResults2);
    } catch (error) {
      console.error("计票错误:", error);
      alert(`解密错误: ${error.message}`);
    } finally {
      setDecrypting(false);
    }
  };

  // 结束投票（管理员功能）
  const endVoting = async () => {
    if (!contract) return;

    try {
      const tx = await contract.endVoting();
      await tx.wait();
      setVotingEnded(true);
      alert("投票已成功结束!");
    } catch (error) {
      console.error("结束投票失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    }
  };

  const ContractManager = () => {
    const [showManager, setShowManager] = useState(false);

    const handleAddContract = () => {
      if (!ethers.isAddress(newContractInput)) {
        alert("请输入有效的合约地址");
        return;
      }

      const updated = [...new Set([...savedContracts, newContractInput])];
      setSavedContracts(updated);
      localStorage.setItem("contractHistory", JSON.stringify(updated));
      setNewContractInput("");
    };

    // 新增的复制按钮点击处理
    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      alert("地址已复制到剪贴板");
    };

    const switchContract = async (address) => {
      if (!ethers.isAddress(address)) return;

      try {
        const provider = new BrowserProvider(window.ethereum);
        const contractInstance = new Contract(
          address,
          VotingABI.abi,
          await provider.getSigner()
        );

        // 验证合约是否有效
        await contractInstance.admin();

        setContract(contractInstance);
        setContractAddress(address);

        // 重置相关状态
        setResults([]);
        setVotingEnded(false);
        fetchWhitelist();
      } catch (e) {
        alert("无效的合约地址或ABI不匹配");
      }
    };

    return (
      <div className="contract-manager">
        <button onClick={() => setShowManager(!showManager)}>
          {showManager ? "隐藏合约管理" : "管理智能合约"}
        </button>
        {showManager && (
          <div className="contract-controls">
            {/* 新增当前合约显示 */}
            <div className="current-contract">
              <p>当前合约地址：</p>
              <div className="address-row">
                <code>{contractAddress}</code>
                <button
                  onClick={() => copyToClipboard(contractAddress)}
                  className="copy-btn"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="contract-input">
              <input
                type="text"
                value={newContractInput}
                onChange={(e) => setNewContractInput(e.target.value)}
                placeholder="输入新合约地址"
              />
              <button onClick={handleAddContract}>添加</button>
            </div>
            <div className="saved-contracts">
              <h4>已保存合约 ({savedContracts.length})：</h4>
              <div className="contract-list">
                {savedContracts.map((addr, i) => (
                  <div
                    key={addr}
                    className={`contract-item ${
                      contractAddress === addr ? "active" : ""
                    }`}
                  >
                    <div
                      className="contract-info"
                      onClick={() => switchContract(addr)}
                    >
                      <span className="address-short">
                        {`${addr.slice(0, 6)}...${addr.slice(-4)}`}
                      </span>
                      {i === 0 && <span className="default-tag">(默认)</span>}
                    </div>
                    <button
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContract(addr);
                      }}
                      disabled={savedContracts.length <= 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Router>
      <div className="container">
        <nav className="nav-bar">
          <Link
            to="/"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">投票大厅</span>
          </Link>
          <Link
            to="/logs"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">📜</span>
            <span className="nav-text">审计日志</span>
          </Link>
          <Link
            to="/candidates"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">候选人</span>
          </Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <div className="container">
                {/* 账户管理栏 */}
                <div className="help-section">
                  <button onClick={() => setShowHelp(!showHelp)}>
                    {showHelp ? "隐藏帮助" : "显示指引"}
                  </button>

                  {showHelp && (
                    <div className="guide">
                      <h3>🗂️ 使用指南</h3>
                      <div className="faq">
                        <h4>如何投票?</h4>
                        <p>
                          1. 连接您的钱包
                          <br />
                          2. 选择候选人
                          <br />
                          3. 点击投票按钮
                        </p>

                        <h4>如何查看结果?</h4>
                        <p>
                          投票结束后点击【计算结果】按钮，系统会自动解密计票结果
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 添加这个新div包裹三个面板 */}
                <div
                  className="control-panels"
                  style={{
                    position: "fixed",
                    top: 20,
                    left: 30, // 调整位置避免重叠
                    zIndex: 1000,
                    display: "flex",
                    gap: "10px",
                  }}
                >
                  {/* 深色模式按钮保持原样 */}
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "transparent",
                      color: "var(--text-color)",
                      border: "2px solid var(--text-color)",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {darkMode ? "🌞 亮色模式" : "🌙 深色模式"}
                  </button>
                  {/* 指引面板 */}
                  {/* 合约管理面板 */}
                  <ContractManager />
                </div>

                {/* <div className="dashboard">
                <div className="info-card">
                  <h3>💰 余额</h3>
                  <p>{ethBalance} ETH</p>
                </div>
                <div className="info-card">
                  <h3>📋 白名单状态</h3>
                  <p>{whitelist.includes(currentAccount) ? "已认证" : "未认证"}</p>
                </div>
              </div> */}

                <div className="account-bar">
                  {currentAccount ? (
                    <>
                      <span className="admin-status">
                        {isAdmin() ? "[管理员] " : "[选民] "}
                      </span>
                      <span className="connected-account">
                        当前账户: {formatAddress(currentAccount)}
                      </span>
                      <button
                        onClick={handleSwitchAccount}
                        className="switch-button"
                      >
                        切换账户
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleSwitchAccount}
                      className="connect-button"
                    >
                      连接钱包
                    </button>
                  )}
                </div>
                <h1>Encrypted Voting DApp</h1>

                {/* 条件渲染投票界面 */}
                {contract ? (
                  <>
                    <div className="section">
                      <h2>Voting Booth</h2>
                      <select
                        value={selected}
                        onChange={(e) => setSelected(parseInt(e.target.value))}
                      >
                        {Array.from({ length: candidates }).map((_, i) => (
                          <option key={i} value={i}>
                            Candidate {i + 1}
                          </option>
                        ))}
                      </select>
                      <button onClick={handleVote}>Cast Vote</button>
                    </div>

                    <div className="section">
                      <h2>Results</h2>
                      <button onClick={calculateResults} disabled={decrypting}>
                        {decrypting ? <ClipLoader size={20} /> : "计算投票结果"}
                      </button>
                      <ul>
                        <div
                          className="chart-section"
                          style={{ height: "300px" }}
                        >
                          <Bar
                            key={results.join()} // 通过唯一key强制重新渲染
                            data={chartData}
                            options={{
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    stepSize: 1,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                        {results.map((result, i) => (
                          <li key={i}>{result}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="connect-prompt">
                    <p>⚠️ 请先连接智能合约以进行投票</p>
                  </div>
                )}

                {/* 管理员面板 */}
                {isAdmin() && (
                  <div className="admin-panel">
                    <h2>管理员控制台</h2>
                    {/* 新投票创建区块 */}
                    <div className="admin-section">
                      <button
                        className="toggle-button"
                        onClick={() => setShowDeploy(!showDeploy)}
                      >
                        🚀 {showDeploy ? "收起" : "创建新投票"}
                      </button>

                      {showDeploy && (
                        <div className="section-collapsible">
                          <div className="deploy-section">
                            <h3>创建新投票</h3>
                            <div className="deploy-section">
                              <h3>创建新投票</h3>

                              <div className="deploy-control">
                                <input
                                  type="number"
                                  min="1"
                                  max="19"
                                  value={voteCount}
                                  onChange={(e) => setVoteCount(e.target.value)}
                                  placeholder="输入投票人数 (1-19)"
                                  disabled={deploying}
                                />
                                <button
                                  onClick={generateRandomWhitelist}
                                  disabled={deploying}
                                >
                                  生成白名单
                                </button>
                              </div>
                              {/* 新增部署状态展示 */}
                              {deploying && (
                                <div className="deploy-status">
                                  <ClipLoader size={20} />
                                  <span>合约部署中...（可能需要15-30秒）</span>
                                </div>
                              )}

                              {generatedWhitelist.length > 0 && (
                                <div className="whitelist-preview">
                                  <h4>
                                    生成的白名单地址 (
                                    {generatedWhitelist.length} 个):
                                  </h4>
                                  <ul>
                                    {generatedWhitelist.map((addr) => (
                                      <li key={addr}>{formatAddress(addr)}</li>
                                    ))}
                                  </ul>
                                  <button
                                    onClick={deployNewContract}
                                    disabled={deploying}
                                  >
                                    {deploying ? "部署中..." : "部署新合约"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 白名单管理区块 */}
                    <div className="admin-section">
                      <button
                        className="toggle-button"
                        onClick={() => setShowWhitelist(!showWhitelist)}
                      >
                        📋 {showWhitelist ? "收起" : "管理白名单"}
                      </button>
                      {showWhitelist && (
                        <div className="section-collapsible">
                          <div className="whitelist-management">
                            <h3>白名单管理</h3>
                            <div className="whitelist-control">
                              <input
                                type="text"
                                value={whitelistAddress}
                                onChange={(e) =>
                                  setWhitelistAddress(e.target.value)
                                }
                                placeholder="输入以太坊地址"
                              />
                              <button onClick={handleAddToWhitelist}>
                                添加地址
                              </button>
                            </div>

                            <div className="whitelist-display">
                              <h3>当前白名单 ({whitelist.length})</h3>

                              {/* 新增搜索框 */}
                              <div className="search-container">
                                <input
                                  type="text"
                                  placeholder="🔍 输入地址片段进行搜索..."
                                  value={searchTerm}
                                  onChange={(e) =>
                                    setSearchTerm(e.target.value)
                                  }
                                  className="search-input"
                                />
                                <div className="search-tip">
                                  支持模糊搜索，不区分大小写
                                </div>
                              </div>
                              <ul>
                                {whitelist
                                  .filter((addr) =>
                                    addr
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase())
                                  )
                                  .map((address, index) => (
                                    <li key={index}>
                                      <div className="address-display">
                                        {/* 新增完整地址展示 */}
                                        <div className="full-address">
                                          {address}
                                        </div>
                                        {/* 保留原有格式化地址 */}
                                        <div className="formatted-address">
                                          {formatAddress(address)}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleRemoveFromWhitelist(address)
                                        }
                                        className="remove-button"
                                      >
                                        移除
                                      </button>
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 投票管理区块 */}
                    {contract && (
                      <div className="admin-section">
                        <button
                          className="toggle-button"
                          onClick={endVoting}
                          disabled={votingEnded}
                        >
                          ⏱️ {votingEnded ? "投票已结束" : "结束当前投票"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            }
          />

          <Route path="/logs" element={<Logs />} />
          <Route path="/candidates" element={<Candidates />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
