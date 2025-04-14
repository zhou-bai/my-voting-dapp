// import { useState, useEffect } from "react";
// import { ethers } from "ethers";
// import VotingABI from "./abis/Voting.json";
// import { useLocation, Link } from "react-router-dom";
// import { BarChart, Search } from "react-feather";
// import { formatDistanceToNow } from "date-fns";
// import zhCN from "date-fns/locale/zh-CN";

// const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// const eventTypes = {
//   Voted: {
//     label: "投票记录",
//     color: "#4CAF50",
//     fields: ["投票人", "时间", "交易哈希"],
//   },
//   WhitelistModified: {
//     label: "白名单变更",
//     color: "#FF9800",
//     fields: ["目标地址", "操作类型", "操作人"],
//   },
//   VotingStatusChanged: {
//     label: "状态变更",
//     color: "#2196F3",
//     fields: ["新状态", "操作人"],
//   },
// };

// const LogPage = () => {
//   const [logs, setLogs] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [timeRange, setTimeRange] = useState("all");
//   const [currentPage, setCurrentPage] = useState(1);
//   const logsPerPage = 15;

//   const parseLog = (log) => {
//     const interface = new ethers.Interface(VotingABI.abi);
//     const parsed = interface.parseLog(log);
//     const eventType = parsed.name;

//     const baseData = {
//       txHash: log.transactionHash,
//       blockNumber: log.blockNumber,
//       timestamp: new Date(log.timestamp * 1000),
//       eventType,
//     };

//     switch (eventType) {
//       case "Voted":
//         return {
//           ...baseData,
//           voter: parsed.args.voter,
//           formattedDate: formatDistanceToNow(log.timestamp * 1000, {
//             addSuffix: true,
//             locale: zhCN,
//           }),
//         };
//       case "WhitelistModified":
//         return {
//           ...baseData,
//           target: parsed.args.target,
//           action: parsed.args.added ? "添加" : "移除",
//           operator: parsed.args.operator,
//         };
//       case "VotingStatusChanged":
//         return {
//           ...baseData,
//           status: parsed.args.ended ? "已结束" : "已开启",
//         };
//       default:
//         return baseData;
//     }
//   };

//   useEffect(() => {
//     const fetchLogs = async () => {
//       if (!window.ethereum) return;

//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const contract = new ethers.Contract(
//         contractAddress,
//         VotingABI.abi,
//         provider
//       );

//       // 获取最近1000个区块的事件
//       const currentBlock = await provider.getBlockNumber();
//       const filter = {
//         address: contractAddress,
//         fromBlock: currentBlock - 1000,
//         toBlock: "latest",
//       };

//       try {
//         const rawLogs = await provider.getLogs(filter);
//         const parsedLogs = rawLogs.map(parseLog).reverse(); // 倒序显示

//         // 补充时间戳（需要请求块信息）
//         const logsWithTimestamp = await Promise.all(
//           parsedLogs.map(async (log) => {
//             const block = await provider.getBlock(log.blockNumber);
//             return {
//               ...log,
//               timestamp: new Date(block.timestamp * 1000),
//             };
//           })
//         );

//         setLogs(logsWithTimestamp);
//       } catch (error) {
//         console.error("日志获取失败:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchLogs();
//   }, []);

//   const filteredLogs = logs.filter((log) => {
//     const matchesSearch = Object.values(log).some(
//       (value) =>
//         typeof value === "string" &&
//         value.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     const matchesTime =
//       timeRange === "all" ||
//       Date.now() - log.timestamp < parseInt(timeRange) * 24 * 60 * 60 * 1000;

//     return matchesSearch && matchesTime;
//   });

//   const indexOfLastLog = currentPage * logsPerPage;
//   const indexOfFirstLog = indexOfLastLog - logsPerPage;
//   const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

//   const renderLogContent = (log) => {
//     switch (log.eventType) {
//       case "Voted":
//         return (
//           <>
//             <div
//               className="log-badge"
//               style={{ backgroundColor: eventTypes.Voted.color }}
//             >
//               {eventTypes.Voted.label}
//             </div>
//             <div className="log-detail">
//               <span>
//                 投票人: {log.voter.slice(0, 6)}...{log.voter.slice(-4)}
//               </span>
//               <span>时间: {log.formattedDate}</span>
//               <a
//                 href={`https://rinkeby.etherscan.io/tx/${log.txHash}`}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="tx-link"
//               >
//                 查看交易详情 <BarChart size={14} />
//               </a>
//             </div>
//           </>
//         );
//       // 其他事件类型的显示逻辑...
//     }
//   };

//   return (
//     <div className="log-container">
//       <div className="log-header">
//         <h1>🗒️ 系统操作日志</h1>
//         <div className="log-controls">
//           <div className="search-box">
//             <Search size={18} className="search-icon" />
//             <input
//               type="text"
//               placeholder="搜索地址或交易哈希..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>

//           <select
//             value={timeRange}
//             onChange={(e) => setTimeRange(e.target.value)}
//             className="time-filter"
//           >
//             <option value="all">全部时间</option>
//             <option value="7">最近7天</option>
//             <option value="30">最近30天</option>
//           </select>
//         </div>
//       </div>

//       <div className="log-list">
//         {loading ? (
//           <div className="loading">加载历史记录中...</div>
//         ) : currentLogs.length > 0 ? (
//           currentLogs.map((log, index) => (
//             <div key={index} className="log-item">
//               {renderLogContent(log)}
//             </div>
//           ))
//         ) : (
//           <div className="empty">未找到匹配的记录 🧐</div>
//         )}
//       </div>

//       <div className="pagination">
//         {Array.from({
//           length: Math.ceil(filteredLogs.length / logsPerPage),
//         }).map((_, i) => (
//           <button
//             key={i}
//             onClick={() => setCurrentPage(i + 1)}
//             className={currentPage === i + 1 ? "active" : ""}
//           >
//             {i + 1}
//           </button>
//         ))}
//       </div>

//       <Link to="/" className="back-button">
//         ⬅ 返回投票页面
//       </Link>
//     </div>
//   );
// };

// export default LogPage;
