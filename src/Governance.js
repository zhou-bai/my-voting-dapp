import { useState, useEffect } from "react";
import { Contract, ethers } from "ethers";
import VotingABI from "./abis/Voting.json";
import { ClipLoader } from "react-spinners";

const Governance = ({ contract, isAdmin }) => {
  const [proposals, setProposals] = useState([]);
  const [newProposalDesc, setNewProposalDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [minVotesToPass, setMinVotesToPass] = useState(3);
  // 单独获取阈值方法
  useEffect(() => {
    const loadMinVotes = async () => {
      if (!contract) return;
      try {
        const votes = await contract.MIN_VOTES_TO_PASS();
        setMinVotesToPass(Number(votes));
      } catch {
        setMinVotesToPass(3); // 默认值
      }
    };
    loadMinVotes();
  }, [contract]);

  // 加载提案数据
  useEffect(() => {
    // 更新提案加载逻辑（转换数值）
    const loadProposals = async () => {
      if (!contract) return;
      try {
        const proposalCount = await contract.getProposalCount();
        const loadedProposals = [];
        if (proposalCount > 0) {
          for (let i = 0; i < proposalCount; i++) {
            const [description, voteCount, executed] =
              await contract.getProposalInfo(i);
            loadedProposals.push({
              description,
              voteCount: Number(voteCount), // 转为数字类型
              executed,
            });
          }
        }
        setProposals(loadedProposals);
      } catch (error) {
        console.error("加载提案失败:", error);
      }
    };

    loadProposals();
  }, [contract]);

  // 获取当前账户
  useEffect(() => {
    const getAccount = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setCurrentAccount(await signer.getAddress());
      }
    };
    getAccount();
  }, []);

  // 创建新提案
  const handleCreateProposal = async () => {
    if (!contract || !isAdmin) return;

    try {
      setLoading(true);
      const tx = await contract.createProposal(newProposalDesc);
      await tx.wait();
      setNewProposalDesc("");
      alert("提案创建成功!");
    } catch (error) {
      console.error("创建提案失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 投票
  const handleVote = async (proposalId) => {
    if (!contract) return;

    try {
      // 检查白名单
      const isWhitelisted = await contract.whitelist(currentAccount);
      if (!isWhitelisted) {
        alert("您不在治理白名单中!");
        return;
      }

      setLoading(true);
      const tx = await contract.voteOnProposal(proposalId);
      await tx.wait();
      alert("投票成功!");
    } catch (error) {
      console.error("投票失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行提案
  const executeProposal = async (proposalId) => {
    if (!contract || !isAdmin) return;
    try {
      setLoading(true);
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();
      // 方法二推荐：直接更新本地提案状态（立即响应）
      setProposals((prev) => {
        return prev.map((proposal, idx) => {
          if (idx === proposalId) {
            return {
              ...proposal,
              executed: true, // 关键修改：立即更新执行状态
              voteCount: Math.max(proposal.voteCount, minVotesToPass), // 防止显示错误
            };
          }
          return proposal;
        });
      });
      alert("提案已执行!");
    } catch (error) {
      console.error("执行失败:", error);
      alert(`错误: ${error.reason || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="governance-container">
      <h2>🏛️ 社区治理</h2>

      {/* 创建提案区块（仅管理员） */}
      {isAdmin && (
        <div className="create-proposal-section">
          <h3>创建新提案</h3>
          <div className="proposal-input">
            <textarea
              value={newProposalDesc}
              onChange={(e) => setNewProposalDesc(e.target.value)}
              placeholder="输入提案描述..."
              rows="3"
            />
            <button
              onClick={handleCreateProposal}
              disabled={loading || !newProposalDesc}
            >
              {loading ? <ClipLoader size={20} /> : "提交提案"}
            </button>
          </div>
        </div>
      )}

      {/* 提案列表 */}
      <div className="proposals-list">
        <h3>进行中的提案 ({proposals.length})</h3>

        {proposals.map((proposal, index) => (
          <div key={index} className="proposal-card">
            <div className="proposal-header">
              <span className="proposal-id">提案 #{index + 1}</span>
              <span
                className={`status ${
                  proposal.executed ? "executed" : "active"
                }`}
              >
                {proposal.executed ? "已执行" : "投票中"}
              </span>
            </div>

            <div className="proposal-body">
              <p className="description">{proposal.description}</p>

              <div className="vote-info">
                <span>当前票数: {proposal.voteCount}</span>
                <span className="pass-requirement">
                  (通过需要 {minVotesToPass} 票)
                </span>
              </div>
            </div>

            <div className="proposal-actions">
              {!proposal.executed && (
                <>
                  <button
                    onClick={() => handleVote(index)}
                    disabled={loading || proposal.executed}
                  >
                    {loading ? <ClipLoader size={20} /> : "投票支持"}
                  </button>

                  {isAdmin && (
                    <button
                      className="execute-button"
                      onClick={() => executeProposal(index)}
                      disabled={
                        proposal.executed ||
                        Number(proposal.voteCount) < minVotesToPass // 确保数值比较
                      }
                    >
                      {proposal.executed ? "已执行" : "执行提案"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 治理说明 */}
      <div className="governance-info">
        <h3>治理规则说明</h3>
        <ul>
          <li>• 每个提案需要至少3票才能通过</li>
          <li>• 只有白名单地址可以参与投票</li>
          <li>• 每个地址对每个提案只能投票一次</li>
          <li>• 只有管理员可以创建和执行提案</li>
        </ul>
      </div>
    </div>
  );
};

export default Governance;
