import { useEffect, useState } from "react";
import { ethers } from "ethers";

export default function UserProfile({ contract, account }) {
  const [userData, setUserData] = useState({
    balance: 0,
    voted: false,
    whitelisted: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (contract && account) {
        const voted = await contract.voters(account);
        const whitelisted = await contract.whitelist(account);

        setUserData({
          voted,
          whitelisted,
        });
      }
    };
    fetchData();
  }, [contract, account]);

  return (
    <div className="user-profile">
      <h2>👤 个人中心</h2>
      <div className="info-card">
        <h3>账户信息</h3>
        <p>地址：{account}</p>
        <p>白名单状态：{userData.whitelisted ? "✅ 已认证" : "❌ 未认证"}</p>
        <p>
          投票状态：
          {userData.voted ? `✅ 已投票` : "❌ 未投票"}
        </p>
      </div>
    </div>
  );
}
