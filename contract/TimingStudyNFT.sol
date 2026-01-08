// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TimingStudyNFT
 * @dev 适配 Arbitrum Sepolia 的自习室质押合约
 * 功能：创建自习室质押 ETH，完成学习后返还 ETH 并铸造勋章 NFT
 */
contract TimingStudyNFT is ERC721, ReentrancyGuard {
    using Strings for uint256;

    uint256 private _nextTokenId;
    
    struct StudySession {
        address student;      // 学习者地址
        uint256 startTime;    // 开始时间戳
        uint256 durationMins; // 要求的自习时长（分钟）
        uint256 stakedAmount; // 质押的 ETH 数量
        bool isCompleted;     // 是否已结课
    }

    // 自习室 ID => 自习室信息
    mapping(uint256 => StudySession) public sessions;
    uint256 public sessionCount;

    // 事件：创建自习室
    event SessionCreated(uint256 indexed sessionId, address indexed student, uint256 duration, uint256 amount);
    // 事件：完成学习并铸造 NFT
    event SessionCompleted(uint256 indexed sessionId, address indexed student, uint256 tokenId);

    constructor() ERC721("TimingStudyNFT", "TSN") {}

    /**
     * @dev ① 创建自习室
     * @param _durationMins 预设的学习时长（分钟）
     */
    function createSession(uint256 _durationMins) external payable {
        require(_durationMins > 0, "Duration must be positive");
        require(msg.value > 0, "Must stake some ETH");

        uint256 sessionId = sessionCount++;
        sessions[sessionId] = StudySession({
            student: msg.sender,
            startTime: block.timestamp,
            durationMins: _durationMins,
            stakedAmount: msg.value,
            isCompleted: false
        });

        emit SessionCreated(sessionId, msg.sender, _durationMins, msg.value);
    }

    /**
     * @dev ② 完成学习
     * 验证时间是否达标 -> 返还质押 -> 铸造 NFT
     * 使用 nonReentrant 防止重入攻击
     */
    function completeStudy(uint256 _sessionId) external nonReentrant {
        StudySession storage session = sessions[_sessionId];

        // 基础检查
        require(!session.isCompleted, "Session already completed");
        require(msg.sender == session.student, "Not your session");
        
        // 时间检查：当前时间 >= 开始时间 + 学习时长
        uint256 requiredTime = session.startTime + (session.durationMins * 1 minutes);
        require(block.timestamp >= requiredTime, "Study time not reached yet");

        // 状态更新（先更新状态，再进行转账，遵循 Checks-Effects-Interactions 模式）
        session.isCompleted = true;
        uint256 refundAmount = session.stakedAmount;

        // 1. 返还质押金额
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "ETH refund failed");

        // 2. 铸造 NFT 勋章
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        emit SessionCompleted(_sessionId, msg.sender, tokenId);
    }

    /**
     * @dev 重写 tokenURI，根据学习时长展示不同的元数据（简单示例）
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        // 在实际应用中，这里通常返回指向 IPFS 的 JSON 链接
        return string(abi.encodePacked("https://api.study.com/metadata/", tokenId.toString()));
    }

    // 允许查询合约当前的 ETH 余额
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

}
//0x5b84F7e75CA4F475Ee9Ba7116e707196b3507B94
