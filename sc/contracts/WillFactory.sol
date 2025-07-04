// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./LastWill.sol";

import "hardhat/console.sol";

contract WillFactory is Ownable {
    struct TokenInfo {
        bool allowed;
        uint8 decimals;
    }

    address public immutable lastWillImplementation;

    mapping(address => address) public creatorToWill;
    mapping(address => address[]) public heirToWills;

    event WillInitialized(address indexed will, address indexed creator, uint256 dueDate);

    error InvalidDueDate();

    constructor(address _lastWillImplementation) Ownable(msg.sender) {
        lastWillImplementation = address(new LastWill());
    }

    function createLastWill(uint256 dueDate) external returns (address lastWill) {
        // Check if dueDate is in the future
        if (dueDate <= block.timestamp) revert InvalidDueDate();

        lastWill = Clones.clone(lastWillImplementation);
        LastWill(lastWill).initialize(dueDate);

        creatorToWill[msg.sender] = lastWill;

        emit WillInitialized(lastWill, msg.sender, dueDate);
    }

    // Getter Functions

    function getCreatedWill() external view returns (address will) {
        return creatorToWill[msg.sender];
    }

    function getInheritedWills() external view returns (address[] memory) {
        return heirToWills[msg.sender];
    }
}
