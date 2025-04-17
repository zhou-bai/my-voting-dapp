import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";
import { ethers } from "ethers";

const Candidates = () => {
  // 候选人数据（更新图片路径）
  const candidates = [
    {
      id: 1,
      name: "候选人1：区块链安全专家",
      description: "专注智能合约安全审计",
      image:
        "https://tse1-mm.cn.bing.net/th/id/OIP-C.jHqyk4s-wyS-ZTsorWQ1QQHaHa?w=201&h=201&c=7&r=0&o=5&dpr=1.3&pid=1.7",
    },
    {
      id: 2,
      name: "候选人2：DeFi创新者",
      description: "去中心化金融协议开发者",
      image:
        "https://tse1-mm.cn.bing.net/th/id/OIP-C.jHqyk4s-wyS-ZTsorWQ1QQHaHa?w=201&h=201&c=7&r=0&o=5&dpr=1.3&pid=1.7",
    },
    {
      id: 3,
      name: "候选人3：跨链架构师",
      description: "多链互操作协议设计",
      image:
        "https://tse1-mm.cn.bing.net/th/id/OIP-C.jHqyk4s-wyS-ZTsorWQ1QQHaHa?w=201&h=201&c=7&r=0&o=5&dpr=1.3&pid=1.7",
    },
  ];

  // 状态管理
  const [contract, setContract] = useState(null);
  const [votingEnded, setVotingEnded] = useState(false);
  const [voteCounts, setVoteCounts] = useState([]); // 修改为票数数组
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);

  // 从localStorage获取合约地址
  const getContractAddress = () => {
    const saved = JSON.parse(localStorage.getItem("contractHistory"));
    return saved && saved.length > 0
      ? saved[0]
      : "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  };
  // 初始化合约连接（修改后）
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const contractAddress = getContractAddress(); // 动态获取地址

          // 增加地址验证
          if (!ethers.isAddress(contractAddress)) {
            throw new Error("非法合约地址");
          }
          const contractInstance = new Contract(
            contractAddress,
            VotingABI.abi,
            provider
          );

          // 验证合约有效性
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

  // 监测投票状态并获取结果
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (!contract) return;

      try {
        // 获取投票结束状态
        const isEnded = await contract.votingEnded();
        setVotingEnded(isEnded);

        // 如果投票已结束则获取并解密数据
        if (isEnded) {
          // 获取加密结果
          const results = await contract.getResults();
          const c1List = results[0].map((n) => n.toString());
          const c2List = results[1].map((n) => n.toString());

          // 解密结果
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

  // 地址格式化显示
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="container candidates-container">
      <h1>候选人参选信息</h1>

      {loading || decrypting ? (
        <div className="loading">
          <ClipLoader size={50} color="#36a2eb" />
          <p>{decrypting ? "正在解密结果..." : "正在加载数据..."}</p>
        </div>
      ) : (
        <div className="candidates-grid">
          {candidates.map((candidate, index) => (
            <div key={candidate.id} className="candidate-card">
              <img
                src={candidate.image}
                alt={candidate.name}
                className="candidate-avatar"
                onError={(e) => {
                  e.target.src =
                    process.env.PUBLIC_URL + "/pictures/fallback-avatar.png";
                }}
              />
              <div className="candidate-info">
                <h2>{candidate.name}</h2>
                <p className="description">{candidate.description}</p>

                <div className="vote-status">
                  {votingEnded ? (
                    <div className="results">
                      <p>累计得票数</p>
                      <div className="total-votes">
                        {voteCounts[index] || 0} 票
                      </div>
                    </div>
                  ) : (
                    <div className="voting-tips">
                      <p className="ongoing">投票进行中</p>
                      <small>结果将在投票结束后公布</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Candidates;
