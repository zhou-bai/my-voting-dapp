import { useState, useEffect } from 'react';
import { VotingCrypto } from './ElGamal';
import { BrowserProvider, Contract } from "ethers";
import VotingABI from './abis/Voting.json';
import './App.css';

function App() {
  const [contract, setContract] = useState(null); // 合约实例
  const [candidates] = useState(3); // 候选人数量
  const [selected, setSelected] = useState(0); // 用户选择的候选人
  const [results, setResults] = useState([]); // 解密后的投票结果
  const [votingEnded, setVotingEnded] = useState(false); // 投票结束状态
  const [currentAccount, setCurrentAccount] = useState(''); // 当前连接账户

  // 管理员密钥对（开发演示用，实际应安全存储）
  const [adminKey] = useState(() => {
    const crypto = new VotingCrypto();
    return crypto.generateKeyPair();
  });

  // 连接合约函数
  const connectContract = async (provider) => {
    const signer = await provider.getSigner();
    const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // 本地开发地址
    return new Contract(contractAddress, VotingABI.abi, signer);
  };

  // 账户切换处理
  const handleSwitchAccount = async () => {
    if (!window.ethereum) return;
    
    try {
      // 触发MetaMask账户切换
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      // 重新初始化合约连接
      const provider = new BrowserProvider(window.ethereum);
      const newContract = await connectContract(provider);
      
      setContract(newContract);
      setCurrentAccount(accounts[0]);
      alert(`已切换至账户: ${formatAddress(accounts[0])}`);
    } catch (error) {
      console.error("账户切换失败:", error);
      alert(`错误: ${error.message}`);
    }
  };

    // 地址格式化显示
  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 初始化效果（组件挂载时执行）
  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new BrowserProvider(window.ethereum);

          // 修复点1：必须await获取signer
          const signer = await provider.getSigner();
          
        /*  const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
          
          // 修复点2：使用v6的Contract构造函数
          const votingContract = new Contract( 
            contractAddress, 
            VotingABI.abi, 
            signer
          );*/
          
          // 获取初始账户
          const account = await signer.getAddress();
          setCurrentAccount(account);
          
          // 建立合约连接
          const votingContract = await connectContract(provider);
          setContract(votingContract);

          // 添加账户变化监听
          window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
              console.log('请连接钱包');
              setCurrentAccount('');
            } else {
              const newContract = await connectContract(new BrowserProvider(window.ethereum));
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
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // 处理投票提交
  const handleVote = async () => {
    if (!contract) return;

    const crypto = new VotingCrypto();
    // 创建投票向量（选中的为1，其他为0）
    const mList = new Array(candidates).fill(0);
    mList[selected] = 1;
    
    // 加密投票
    const encrypted = crypto.encryptVote(mList, adminKey.publicKey);
    const c1List = encrypted.map(e => e.c1);
    const c2List = encrypted.map(e => e.c2);
    
    try {
      // 发送交易
      const tx = await contract.vote(c1List, c2List);
      await tx.wait();
      alert('Vote submitted successfully!');
    } catch (error) {
      console.error("Voting failed:", error);
    }
  };

  // 计算并解密结果
  const calculateResults = async () => {
    if (!contract) return;
  
    try {
      // 先检查投票状态
      const isEnded = await contract.votingEnded.staticCall();
      if (!isEnded) {
        alert("结果将在投票结束后公布"); //提前拦截
        return;
      }

      // 获取加密结果
      const crypto = new VotingCrypto();
      const [c1Results, c2Results] = await contract.getResults();
      
      // 解密每个候选人的总票数
      const decryptedResults = [];
      for (let i=0; i<candidates; i++) {
        const count = crypto.decrypt(c1Results[i], c2Results[i], adminKey.privateKey);
        decryptedResults.push(`候选人 ${i+1}: ${count}票`);
      }
      setResults(decryptedResults);
      
    } catch (error) {
      console.error("计票错误:", error);
      alert(`错误: ${error.reason || error.message}`);
    }
  };

  // 结束投票（管理员功能）
  const endVoting = async () => {
    if (!contract) return;
    
    try {
      const tx = await contract.endVoting();
      await tx.wait();
      setVotingEnded(true);
      alert('投票已成功结束!');
    } catch (error) {
      console.error("结束投票失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    }
  };
  


  return (
    <div className="container">
      {/* 账户管理栏 */}
      <div className="account-bar">
        {currentAccount ? (
          <>
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
      <div className="section">
        <h2>Voting Booth</h2>
        <select 
          value={selected} 
          onChange={e => setSelected(parseInt(e.target.value))}
        >
          {Array.from({length: candidates}).map((_, i) => (
            <option key={i} value={i}>Candidate {i+1}</option>
          ))}
        </select>
        <button onClick={handleVote}>Cast Vote</button>
      </div>

      <div className="section">
        <h2>Results</h2>
        <button onClick={calculateResults}>Calculate Results</button>
        <ul>
          {results.map((result, i) => (
            <li key={i}>{result}</li>
          ))}
        </ul>
      </div>

      <div className="admin-panel">
        <h2>Administration</h2>
        <button 
        onClick={endVoting}
        className="admin-button"
        disabled={votingEnded}
        >
        {votingEnded ? '投票已结束' : '结束投票'}
        </button>
      </div>

      {/*
      管理员信息展示模块注释
      <div className="admin-info">
        <h3>Admin Keys (Demo Only)</h3>
        <p>Public Key: {adminKey.publicKey}</p>
        <p>Private Key: {adminKey.privateKey}</p>
      </div>      
      */}
    
      
    </div>
  );
}

export default App;
