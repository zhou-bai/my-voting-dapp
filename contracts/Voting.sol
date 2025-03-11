// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EncryptedVoting {
    address public admin;
    // ElGamal 加密参数：大素数 p 和生成元 g
    uint256 public immutable p;
    uint256 public immutable g;

    // 候选人结构体，存储加密投票的累积值（c1, c2）
    struct Candidate {
        uint256 c1; // ElGamal 密文第一部分
        uint256 c2; // ElGamal 密文第二部分
    }

    Candidate[] public candidates; // 候选人列表
    mapping(address => bool) public voters; // 已投票地址记录
    bool public votingEnded; // 投票是否结束标志

    // 构造函数：初始化投票系统
    constructor(uint256 _candidateCount, uint256 _p, uint256 _g) {
        admin = msg.sender;
        p = _p;
        g = _g;

        // 初始化候选人加密值为乘法单位元（1）
        for (uint i = 0; i < _candidateCount; i++) {
            candidates.push(Candidate(1, 1)); // 初始为乘性单位元
        }
    }

    // 管理员权限修饰器
    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    // 投票函数（核心逻辑）
    function vote(
        uint256[] calldata c1List,
        uint256[] calldata c2List
    ) external {
        require(!votingEnded, "Voting ended");
        require(!voters[msg.sender], "Already voted");
        require(c1List.length == candidates.length, "Invalid c1 data");
        require(c2List.length == candidates.length, "Invalid c2 data");

        // 累积所有投票的密文（模乘操作）
        for (uint i = 0; i < candidates.length; i++) {
            candidates[i].c1 = mulmod(candidates[i].c1, c1List[i], p);
            candidates[i].c2 = mulmod(candidates[i].c2, c2List[i], p);
        }

        voters[msg.sender] = true; // 标记已投票
    }

    // 结束投票（仅管理员）
    function endVoting() external onlyAdmin {
        votingEnded = true;
    }

    // 获取加密结果（仅投票结束后可用）
    function getResults()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        require(votingEnded, "Voting not ended");

        // 返回所有候选人的累积加密结果
        uint256[] memory c1Results = new uint256[](candidates.length);
        uint256[] memory c2Results = new uint256[](candidates.length);

        for (uint i = 0; i < candidates.length; i++) {
            c1Results[i] = candidates[i].c1;
            c2Results[i] = candidates[i].c2;
        }
        return (c1Results, c2Results);
    }
}
