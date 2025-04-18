// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract EncryptedVoting {
    address public immutable admin;
    uint256 public immutable p;
    uint256 public immutable g;
    struct Candidate {
        string name; // 新增名字字段
        string description; // 新增描述字段
        uint256 c1;
        uint256 c2;
    }

    Candidate[] public candidates;
    mapping(address => bool) public voters;
    mapping(address => bool) public whitelist;
    bool public votingEnded;
    event CandidateAdded(
        uint256 indexed candidateId,
        string name,
        string description
    );
    event Voted(
        address indexed voter,
        uint256 timestamp,
        uint256[] c1List,
        uint256[] c2List
    );
    constructor(
        string[] memory _names, // 使用名字数组
        string[] memory _descriptions, // 使用描述数组
        uint256 _p,
        uint256 _g,
        address[] memory _predefinedWhitelist
    ) {
        require(
            _names.length == _descriptions.length,
            "Name and description array mismatch"
        );
        require(_names.length > 0, "At least one candidate required");

        admin = msg.sender; // 改为使用部署者地址
        p = _p;
        g = _g;
        // 初始化候选人
        for (uint i = 0; i < _names.length; i++) {
            _addCandidate(_names[i], _descriptions[i]);
        }
        // 初始化白名单
        for (uint i = 0; i < _predefinedWhitelist.length; i++) {
            address addr = _predefinedWhitelist[i];
            require(!whitelist[addr], "Duplicate address in whitelist");
            whitelist[addr] = true;
        }
    }
    // 新增内部方法添加候选人
    function _addCandidate(
        string memory _name,
        string memory _description
    ) internal {
        candidates.push(
            Candidate({
                name: _name,
                description: _description,
                c1: 1, // 初始化加密参数
                c2: 1
            })
        );
        emit CandidateAdded(candidates.length - 1, _name, _description);
    }
    // 新增获取候选人详细信息方法
    function getCandidateInfo(
        uint256 _candidateId
    )
        external
        view
        returns (
            string memory name,
            string memory description,
            uint256 c1,
            uint256 c2
        )
    {
        require(_candidateId < candidates.length, "Invalid candidate ID");
        Candidate storage c = candidates[_candidateId];
        return (c.name, c.description, c.c1, c.c2);
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
        require(whitelist[msg.sender], "Not in whitelist");
        require(!voters[msg.sender], "Already voted");
        require(c1List.length == candidates.length, "Invalid c1 data");
        require(c2List.length == candidates.length, "Invalid c2 data");

        for (uint i = 0; i < candidates.length; i++) {
            candidates[i].c1 = mulmod(candidates[i].c1, c1List[i], p);
            candidates[i].c2 = mulmod(candidates[i].c2, c2List[i], p);
        }

        voters[msg.sender] = true;
        emit Voted(msg.sender, block.timestamp, c1List, c2List);
    }

    // 添加白名单
    function addToWhitelist(address _address) external onlyAdmin {
        require(!whitelist[_address], "Address already in whitelist");
        whitelist[_address] = true;
    }

    // 新增：移除白名单
    function removeFromWhitelist(address _address) external onlyAdmin {
        require(whitelist[_address], "Address not in whitelist");
        whitelist[_address] = false;
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
    function getCandidateCount() public view returns (uint256) {
        return candidates.length;
    }
}
