// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract WillEscrow {
    struct TokenBalance {
        uint256 amount;
        address owner;
        bool isNative;
    }

    // Mapping of (willAddress => tokenAddress => balance)
    mapping(address => mapping(address => TokenBalance)) public tokenBalances;

    // Track total native ETH per will
    mapping(address => uint256) public nativeBalances;

    // Track which contracts can call transfer functions
    mapping(address => bool) public authorizedCallers;

    // Track which wills are registered
    mapping(address => bool) public registeredWills;

    error UnauthorizedCaller();
    error InsufficientBalance();
    error WillNotRegistered();
    error InvalidTransfer();
    error NotDueYet();
    error AlreadyExecuted();

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender]) revert UnauthorizedCaller();
        _;
    }

    modifier onlyRegisteredWill() {
        if (!registeredWills[msg.sender]) revert WillNotRegistered();
        _;
    }

    address public factory;

    function setFactory(address _factory) external {
        factory = _factory;
        authorizedCallers[factory] = true;
    }

    function authorize(address caller) external {
        if (msg.sender != factory) revert UnauthorizedCaller();
        authorizedCallers[caller] = true;
    }

    //@note change this => everyone can call this
    function transferETH(address payable to, uint256 amount) external {
        if (!authorizedCallers[msg.sender]) revert UnauthorizedCaller();
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function transferERC20(address token, address to, uint256 amount) external {
        if (!authorizedCallers[msg.sender]) revert UnauthorizedCaller();
        require(IERC20(token).transfer(to, amount), "ERC20 transfer failed");
    }

    receive() external payable {}
}
