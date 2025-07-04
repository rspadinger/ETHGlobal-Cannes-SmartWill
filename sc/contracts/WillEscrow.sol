// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./LastWill.sol";

import "hardhat/console.sol";

contract WillEscrow {
    struct TokenBalance {
        uint256 amount;
        address owner; //creator of the will
    }

    address public factory;

    // Mapping of (willAddress => tokenAddress => balance)
    mapping(address => mapping(address => TokenBalance)) public tokenBalances;

    // Track total native ETH per will
    mapping(address => uint256) public nativeBalances;

    // Track which contracts can call transfer functions => creators and heirs
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

    function setFactory(address _factory) external {
        factory = _factory;
        authorizedCallers[factory] = true;
    }

    function authorize(address caller) external {
        if (msg.sender != factory) revert UnauthorizedCaller();
        authorizedCallers[caller] = true;
    }

    //@todo when transferring tokens to heirs, deduct a small protocol fee

    //@audit can only be called by LastWill contract
    function transferERC20(
        address will,
        address token,
        address to,
        uint256 amount
    ) external onlyAuthorized onlyRegisteredWill {
        TokenBalance storage balance = tokenBalances[will][token];

        // Verify the transfer is valid
        if (balance.amount < amount) revert InsufficientBalance();

        // Check if transfer is authorized
        bool isOwner = msg.sender == balance.owner;
        bool isHeir = isHeirTransfer(will, to, amount, token);

        //@audit only LastWill is allowed to call
        if (!isOwner && !isHeir) revert InvalidTransfer();

        // Update balance
        balance.amount -= amount;

        // Transfer tokens
        bool success = IERC20(token).transfer(to, amount);
        require(success, "Transfer failed");
    }

    function transferETH(
        address will,
        address payable to,
        uint256 amount
    ) external onlyAuthorized onlyRegisteredWill {
        // Verify the transfer is valid
        if (nativeBalances[will] < amount) revert InsufficientBalance();

        // Check if transfer is authorized
        bool isOwner = msg.sender == tokenBalances[will][address(0)].owner;
        bool isHeir = isHeirTransfer(will, to, amount, address(0));

        if (!isOwner && !isHeir) revert InvalidTransfer();

        // Update balance
        nativeBalances[will] -= amount;

        // Transfer ETH
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // Helper function to check if transfer is to a heir with correct amount
    function isHeirTransfer(
        address will,
        address to,
        uint256 amount,
        address token
    ) internal view returns (bool) {
        // Get will contract
        LastWill willContract = LastWill(will);

        // Check if will is due
        if (block.timestamp < willContract.dueDate()) revert NotDueYet();

        // Get heir data
        (LastWill.Heir memory heir, , ) = willContract.getHeirByAddress(to);

        if (heir.executed) revert AlreadyExecuted();

        // For native transfers (token == address(0)), check nativeAmounts
        if (token == address(0)) {
            uint256 nativeAmount = willContract.getNativeTokenAmount(to);
            return nativeAmount == amount;
        }

        // For ERC20 transfers, check the specific token amount
        for (uint256 i = 0; i < heir.tokens.length; i++) {
            if (heir.tokens[i] == token && heir.amounts[i] == amount) {
                return true;
            }
        }

        return false;
    }

    function registerDeposit(address will, address token, uint256 amount) external onlyAuthorized {
        //for native token
        if (token == address(0)) {
            nativeBalances[will] += amount;
            tokenBalances[will][address(0)] = TokenBalance({amount: amount, owner: msg.sender});
        } else {
            tokenBalances[will][token] = TokenBalance({amount: amount, owner: msg.sender});
        }
    }

    function registerWill(address will) external onlyAuthorized {
        registeredWills[will] = true;
    }

    receive() external payable {}
}
