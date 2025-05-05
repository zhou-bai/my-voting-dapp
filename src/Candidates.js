import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";
import { ethers } from "ethers";

const Candidates = () => {
  const [contract, setContract] = useState(null);
  const [votingEnded, setVotingEnded] = useState(false);
  const [voteCounts, setVoteCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  // 修改为存储完整候选人数据
  const [candidatesData, setCandidatesData] = useState([]);
  const [showManager, setShowManager] = useState(false);
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

  // 新增合约管理方法
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
      await contractInstance.admin();
      setContractAddress(address);
      setContract(contractInstance);
      // 刷新候选人数据
      const count = await contractInstance.getCandidateCount();
      const detailedCandidates = await fetchCandidatesData(
        contractInstance,
        count
      );
      setCandidatesData(detailedCandidates);
    } catch (e) {
      alert("无效的合约地址或ABI不匹配");
    }
  };

  const handleDeleteContract = (addressToDelete) => {
    if (savedContracts.length <= 1) {
      alert("至少需要保留一个合约地址");
      return;
    }
    if (window.confirm("确定要删除这个合约地址吗？")) {
      const updated = savedContracts.filter((addr) => addr !== addressToDelete);
      setSavedContracts(updated);
      localStorage.setItem("contractHistory", JSON.stringify(updated));
      if (contractAddress === addressToDelete) {
        setContractAddress(updated[0]);
      }
    }
  };

  // 从合约获取候选人数据的异步方法
  const fetchCandidatesData = async (contractInstance, count) => {
    try {
      const requests = Array.from({ length: count }).map((_, index) =>
        contractInstance.getCandidateInfo(index)
      );

      const rawData = await Promise.all(requests);
      return rawData.map(([name, description], idx) => ({
        id: idx + 1,
        name: name || `候选人 ${idx + 1}`,
        description: description || "资深的区块链技术专家",
        image: generateAvatarUrl(name || `候选人 ${idx + 1}`),
      }));
    } catch (error) {
      console.error("候选人数据获取失败:", error);
      return [];
    }
  };

  // 头像URL生成逻辑
  const generateAvatarUrl = (name) => {
    const encodedName = encodeURIComponent(name);
    return `https://avatars.dicebear.com/api/identicon/${encodedName}.svg?background=%23000000`;
  };

  // 初始化合约连接
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const contractInstance = new Contract(
            contractAddress, // 使用状态中的地址
            VotingABI.abi,
            provider
          );

          // 并行获取基础数据
          const [count, isEnded] = await Promise.all([
            contractInstance.getCandidateCount(),
            contractInstance.votingEnded(),
          ]);

          const candidateCount = Number(count);
          // 获取详细候选人数据
          const detailedCandidates = await fetchCandidatesData(
            contractInstance,
            candidateCount
          );

          // 更新状态
          setCandidatesData(detailedCandidates);
          setVotingEnded(isEnded);
          setContract(contractInstance);

          // 投票结束后获取结果
          if (isEnded) {
            const results = await contractInstance.getResults();
            const decrypted = await decryptResults(
              results[0].map((n) => n.toString()),
              results[1].map((n) => n.toString())
            );
            setVoteCounts(decrypted.map(Number));
          }
        } catch (error) {
          console.error("初始化失败:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    initContract();
  }, [contractAddress]); // 添加contractAddress作为依赖

  // 解密方法（保持原有逻辑）
  const decryptResults = async (c1List, c2List) => {
    setDecrypting(true);
    try {
      const response = await fetch("http://localhost:3001/api/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c1List, c2List }),
      });
      if (!response.ok) throw new Error("解密请求失败");
      return (await response.json()).results;
    } finally {
      setDecrypting(false);
    }
  };

  // 渲染技术标签的辅助函数
  const renderTechTags = () => (
    <div className="tag-list">
      {["智能合约", "密码学", "共识算法"].map((tag) => (
        <span key={tag} className="tag">
          {tag}
        </span>
      ))}
    </div>
  );

  return (
    <div className="container candidates-container">
      {/* 新增合约管理面板 */}
      <div className="contract-manager" style={{ marginBottom: "2rem" }}>
        <button onClick={() => setShowManager(!showManager)}>
          {showManager ? "隐藏合约管理" : "管理智能合约"}
        </button>
        {showManager && (
          <div className="contract-controls">
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
                      {i === 0 && <span className="default-tag">(最新)</span>}
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
      <h1>区块链专家候选人（{candidatesData.length}位）</h1>

      {loading || decrypting ? (
        <div className="loading">
          <ClipLoader size={50} color="#36a2eb" />
          <p>{decrypting ? "正在解密结果..." : "正在加载数据..."}</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {candidatesData.map((candidate, index) => (
            <div key={candidate.id} className="candidate-card">
              <div className="avatar-container">
                <img
                  src={candidate.image}
                  alt={candidate.name}
                  className="candidate-avatar"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/150/008CBA/FFFFFF?text=Expert";
                  }}
                />
                <div className="candidate-id">ID: {candidate.id}</div>
              </div>

              <div className="candidate-info">
                <h2 title={candidate.name}>{candidate.name}</h2>

                <div className="expert-tag">
                  <span>技术方向</span>
                  {renderTechTags()}
                </div>

                <p className="description" title={candidate.description}>
                  {candidate.description}
                </p>

                <div className="vote-status">
                  {votingEnded ? (
                    <div className="results-box">
                      <div className="progress-bar">
                        <div
                          className="progress"
                          style={{
                            width: `${
                              (voteCounts[index] / Math.max(...voteCounts)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="vote-count">
                        {voteCounts[index]?.toLocaleString() ?? 0} 票
                      </div>
                    </div>
                  ) : (
                    <div className="voting-badge">
                      <span>投票进行中</span>
                      <div className="live-indicator" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && candidatesData.length === 0 && (
        <div className="empty-state">
          <h3>当前没有候选人</h3>
          <p>请等待管理员发起新选举</p>
          <button
            className="refresh-button"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      )}
    </div>
  );
};

export default Candidates;
