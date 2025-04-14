import { useState, useEffect } from "react";
import { Contract, BrowserProvider } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";
import "./App.css";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [searchAddress, setSearchAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);

  // 时间戳转日期格式
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000); // timestamp已经转换为Number
    return date.toLocaleString();
  };
  // 地址格式化显示
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 加载日志数据
  // 修改加载日志部分
  const loadLogs = async () => {
    if (!contract) return;
    try {
      const filter = contract.filters.Voted();
      const events = await contract.queryFilter(filter);
      const formattedLogs = events.map((event) => ({
        voter: event.args.voter,
        // 显式转换为Number类型
        timestamp: Number(event.args.timestamp),
        // 显式字符串转换
        c1List: event.args.c1List.map((n) => n.toString()),
        c2List: event.args.c2List.map((n) => n.toString()),
        transactionHash: event.transactionHash,
        // 显式数值转换
        blockNumber: Number(event.blockNumber),
      }));
      setLogs(formattedLogs);
    } catch (error) {
      console.error("加载日志失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化合约连接
  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
          const contractInstance = new Contract(
            contractAddress,
            VotingABI.abi,
            provider
          );
          setContract(contractInstance);
        } catch (error) {
          console.error("合约初始化失败:", error);
        }
      }
    };

    initContract();
  }, []);

  // 当合约变化时加载数据
  useEffect(() => {
    if (contract) {
      loadLogs();
    }
  }, [contract]);

  // 修改筛选条件中的时间比较逻辑
  const filteredLogs = logs.filter((log) => {
    const matchesAddress = searchAddress
      ? log.voter.toLowerCase().includes(searchAddress.toLowerCase())
      : true;

    // 转换为纯数字时间戳进行比较
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
                  加密票数 <br />
                  <small>(C1列表，显示前两个数值)</small>
                </th>
                <th className="data-col">
                  加密签名 <br />
                  <small>(C2列表，显示前两个数值)</small>
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
