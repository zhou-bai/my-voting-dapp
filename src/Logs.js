import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";
import { ethers } from "ethers";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [searchAddress, setSearchAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);

  // 新增合约管理相关状态
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

  // 合约操作方法
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

  // 时间戳转日期格式
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // 地址格式化显示
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 初始化合约连接
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const checksumAddress = ethers.getAddress(contractAddress);
          const contractInstance = new Contract(
            checksumAddress,
            VotingABI.abi,
            provider
          );
          await contractInstance.votingEnded();
          setContract(contractInstance);
        } catch (error) {
          console.error("日志合约连接失败:", error);
          setContract(null);
        }
      }
    };
    initContract();
  }, [contractAddress]);

  // 加载日志数据
  useEffect(() => {
    const loadLogs = async () => {
      if (!contract) return;
      try {
        const filter = contract.filters.Voted();
        const events = await contract.queryFilter(filter);
        const formattedLogs = events.map((event) => ({
          voter: event.args.voter,
          timestamp: Number(event.args.timestamp),
          c1List: event.args.c1List.map((n) => n.toString()),
          c2List: event.args.c2List.map((n) => n.toString()),
          transactionHash: event.transactionHash,
          blockNumber: Number(event.blockNumber),
        }));
        setLogs(formattedLogs);
      } catch (error) {
        console.error("加载日志失败:", error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [contract]);

  // 筛选逻辑
  const filteredLogs = logs.filter((log) => {
    const matchesAddress = searchAddress
      ? log.voter.toLowerCase().includes(searchAddress.toLowerCase())
      : true;

    const logTimestamp = log.timestamp * 1000;
    const startTimestamp = new Date(startDate).getTime() || 0;
    const endTimestamp =
      new Date(endDate + "T23:59:59").getTime() || Date.now();
    return (
      matchesAddress &&
      logTimestamp >= startTimestamp &&
      logTimestamp <= endTimestamp
    );
  });

  return (
    <div className="container logs-container">
      {/* 合约管理模块 */}
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

      <h1>投票日志查询</h1>

      {/* 搜索栏 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索地址..."
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
        />

        <div className="date-range">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* 加载状态 */}
      {loading ? (
        <div className="loading">
          <ClipLoader size={50} color="#36a2eb" />
          <p>正在加载日志...</p>
        </div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th className="address-col">投票地址</th>
                <th className="time-col">投票时间</th>
                <th className="data-col">
                  加密内容 <br />
                  <small>(C1列表)</small>
                </th>
                <th className="data-col">
                  加密内容 <br />
                  <small>(C2列表)</small>
                </th>
                <th className="hash-col">交易哈希值</th>
                <th className="block-col">区块编号</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={index}>
                  <td title={log.voter}>{formatAddress(log.voter)}</td>
                  <td>{formatTimestamp(log.timestamp)}</td>
                  <td className="encrypted-data">
                    [{log.c1List.slice(0, 2).join(", ")}...]
                  </td>
                  <td className="encrypted-data">
                    [{log.c2List.slice(0, 2).join(", ")}...]
                  </td>
                  <td title={log.transactionHash}>
                    {formatAddress(log.transactionHash)}
                  </td>
                  <td>{log.blockNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="no-results">未找到匹配的投票记录</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logs;
