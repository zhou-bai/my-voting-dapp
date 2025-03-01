// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EncryptedVoting {
    address public admin;
    uint256 public immutable p;
    uint256 public immutable g;

    struct Candidate {
        uint256 c1;
        uint256 c2;
    }

    Candidate[] public candidates;
    mapping(address => bool) public voters;
    bool public votingEnded;

    constructor(uint256 _candidateCount, uint256 _p, uint256 _g) {
        admin = msg.sender;
        p = _p;
        g = _g;

        for (uint i = 0; i < _candidateCount; i++) {
            candidates.push(Candidate(1, 1)); // 初始为乘性单位元
        }
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    function vote(
        uint256[] calldata c1List,
        uint256[] calldata c2List
    ) external {
        require(!votingEnded, "Voting ended");
        require(!voters[msg.sender], "Already voted");
        require(c1List.length == candidates.length, "Invalid c1 data");
        require(c2List.length == candidates.length, "Invalid c2 data");

        for (uint i = 0; i < candidates.length; i++) {
            candidates[i].c1 = mulmod(candidates[i].c1, c1List[i], p);
            candidates[i].c2 = mulmod(candidates[i].c2, c2List[i], p);
        }

        voters[msg.sender] = true;
    }

    function endVoting() external onlyAdmin {
        votingEnded = true;
    }

    function getResults()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        require(votingEnded, "Voting not ended");

        uint256[] memory c1Results = new uint256[](candidates.length);
        uint256[] memory c2Results = new uint256[](candidates.length);

        for (uint i = 0; i < candidates.length; i++) {
            c1Results[i] = candidates[i].c1;
            c2Results[i] = candidates[i].c2;
        }
        return (c1Results, c2Results);
    }
}
