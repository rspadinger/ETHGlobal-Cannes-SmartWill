// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./LastWill.sol";

import "hardhat/console.sol";

contract WillFactory is Ownable {
    struct TokenInfo {
        bool allowed;
        uint8 decimals;
    }

    address public immutable lastWillImplementation;
    address public immutable registry;

    mapping(address => address) public creatorToWill;
    mapping(address => address[]) public heirToWills;
    mapping(address => TokenInfo) public tokenWhiteList;
    address[] public whiteListedTokens;

    event TokenAddedToWhiteList(address virtualLiquidityToken);
    event TokenRemovedFromWhiteList(address virtualLiquidityToken);
    event WillInitialized(address indexed will, address indexed creator, uint256 dueDate);

    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error Unauthorized();
    error InvalidDueDate();

    modifier onlyWhiteListed(address token) {
        if (!tokenWhiteList[token].allowed) revert TokenNotWhitelisted();
        _;
    }

    constructor(address _registry) Ownable(msg.sender) {
        lastWillImplementation = address(new LastWill(address(this), address(0), _registry));
        registry = _registry;
    }

    function createLastWill(uint256 dueDate) external returns (address lastWill) {
        // Check if dueDate is in the future
        if (dueDate <= block.timestamp) revert InvalidDueDate();

        lastWill = Clones.clone(lastWillImplementation);
        LastWill(lastWill).initialize(msg.sender, dueDate);

        emit WillInitialized(lastWill, msg.sender, dueDate);
    }

    // Admin Functions

    function addTokenToWhiteList(address token) external onlyOwner {
        if (tokenWhiteList[token].allowed) revert TokenAlreadyWhitelisted();
        uint8 decimals = IERC20Metadata(token).decimals();
        tokenWhiteList[token] = TokenInfo({allowed: true, decimals: decimals});
        whiteListedTokens.push(token);
        emit TokenAddedToWhiteList(token);
    }

    function removeTokenFromWhiteList(address token) public onlyOwner {
        if (tokenWhiteList[token].allowed) {
            tokenWhiteList[token] = TokenInfo({allowed: false, decimals: 0});

            for (uint256 i = 0; i < whiteListedTokens.length; i++) {
                if (whiteListedTokens[i] == token) {
                    whiteListedTokens[i] = whiteListedTokens[whiteListedTokens.length - 1];
                    whiteListedTokens.pop();
                    break;
                }
            }
            emit TokenRemovedFromWhiteList(token);
        }
    }

    // Getter Functions

    function getCreatedWill() external view returns (address will) {
        return creatorToWill[msg.sender];
    }

    function getInheritedWills() external view returns (address[] memory) {
        return heirToWills[msg.sender];
    }

    function getWhiteListedTokens() external view returns (address[] memory, uint8[] memory) {
        uint256 length = whiteListedTokens.length;
        address[] memory tokens = new address[](length);
        uint8[] memory decimals = new uint8[](length);

        for (uint256 i = 0; i < length; i++) {
            address token = whiteListedTokens[i];
            tokens[i] = token;
            decimals[i] = tokenWhiteList[token].decimals;
        }

        return (tokens, decimals);
    }
}
