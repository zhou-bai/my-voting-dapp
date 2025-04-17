import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";
import { ethers } from "ethers";
const Candidates = () => {
  // 状态管理
  const [contract, setContract] = useState(null);
  const [votingEnded, setVotingEnded] = useState(false);
  const [voteCounts, setVoteCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [candidateCount, setCandidateCount] = useState(0);
  // 统一候选人模板
  const UNIFIED_TEMPLATE = {
    name: "区块链专家",
    description: "资深区块链技术专家，专注去中心化系统开发",
    image:
      "https://tse1-mm.cn.bing.net/th/id/OIP-C.jHqyk4s-wyS-ZTsorWQ1QQHaHa?w=201&h=201&c=7&r=0&o=5&dpr=1.3&pid=1.7",
  };
  // 生成候选人数据
  const generateCandidates = () => {
    return Array.from({ length: candidateCount }).map((_, index) => ({
      id: index + 1,
      name: `候选人${index + 1}`,
      // 从合约获取候选人名称（需要合约支持getName方法）
      // name: await contract.getName(index) || `候选人${index + 1}`,
      ...UNIFIED_TEMPLATE,
    }));
  };
  // 从localStorage获取合约地址
  const getContractAddress = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("contractHistory"));
      return saved?.[0] ?? "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    } catch (e) {
      console.error("读取本地存储失败:", e);
      return "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    }
  };
  // 初始化合约连接
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const contractAddress = getContractAddress();

          if (!ethers.isAddress(contractAddress)) {
            throw new Error("非法合约地址");
          }
          const contractInstance = new Contract(
            contractAddress,
            VotingABI.abi,
            provider
          );
          // 获取候选人数量
          const count = await contractInstance.getCandidateCount();
          setCandidateCount(Number(count));
          await contractInstance.admin();
          setContract(contractInstance);
        } catch (error) {
          console.error("合约连接失败:", error);
          setContract(null);
        }
      }
    };
    initContract();
  }, []);

  // 处理解密逻辑
  const decryptResults = async (c1List, c2List) => {
    setDecrypting(true);
    try {
      const response = await fetch("http://localhost:3001/api/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          c1List: c1List,
          c2List: c2List,
        }),
      });

      if (!response.ok) throw new Error("解密请求失败");
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error("解密失败:", error);
      throw error;
    } finally {
      setDecrypting(false);
    }
  };

  // 监测投票状态
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (!contract) return;
      try {
        const isEnded = await contract.votingEnded();
        setVotingEnded(isEnded);
        if (isEnded) {
          const results = await contract.getResults();
          const c1List = results[0].map((n) => n.toString());
          const c2List = results[1].map((n) => n.toString());
          const decryptedCounts = await decryptResults(c1List, c2List);
          setVoteCounts(decryptedCounts.map((count) => parseInt(count)));
        }
      } catch (error) {
        console.error("数据获取失败:", error);
      } finally {
        setLoading(false);
      }
    };
    checkVotingStatus();
  }, [contract]);
  return (
    <div className="container candidates-container">
      <h1>区块链专家候选人（{candidateCount}位）</h1>
      {loading || decrypting ? (
        <div className="loading">
          <ClipLoader size={50} color="#36a2eb" />
          <p>{decrypting ? "正在解密结果..." : "正在加载数据..."}</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {generateCandidates().map((candidate, index) => (
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
                <h2>{candidate.name}</h2>
                <div className="expert-tag">
                  <span>技术方向</span>
                  <div className="tag-list">
                    <span className="tag">智能合约</span>
                    <span className="tag">共识算法</span>
                    <span className="tag">密码学</span>
                  </div>
                </div>
                <p className="description">{candidate.description}</p>
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
                        ></div>
                      </div>
                      <div className="vote-count">
                        {(voteCounts[index] || 0).toLocaleString()} 票
                      </div>
                    </div>
                  ) : (
                    <div className="voting-badge">
                      <span>投票进行中</span>
                      <div className="live-indicator"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {candidateCount === 0 && !loading && (
        <div className="empty-state">
          <h3>当前没有候选人</h3>
          <p>请等待管理员发起新选举</p>
        </div>
      )}
    </div>
  );
};
export default Candidates;
