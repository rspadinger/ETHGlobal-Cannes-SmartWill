// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract LastWill {
    struct Heir {
        address wallet;
        address[] tokens;
        uint256[] amounts;
    }

    bool public initialized;
    uint256 public dueDate;
    bool public executed;

    Heir[] public heirs;

    event LastWillDeployed(address lastWill);
    event HeirAdded(address indexed heir, address[] tokens, uint256[] amounts);
    event DueDateUpdated(uint256 newDate);

    error AlreadyExecuted();
    error NotDueYet();
    error AlreadyInitialized();

    function initialize(uint256 _dueDate) external {
        if (initialized) revert AlreadyInitialized();
        initialized = true;
        dueDate = _dueDate;

        emit LastWillDeployed(address(this));
    }

    function updateDueDate(uint256 newDate) external {
        dueDate = newDate;
        emit DueDateUpdated(newDate);
    }

    function executeLasWill() external {
        //@todo pay service fee to protocol & transfer tokens

        if (executed) revert AlreadyExecuted();
        if (block.timestamp < dueDate) revert NotDueYet();
        executed = true;

        //@todo transfer tokens to heirs
    }

    function getHeirs() external view returns (Heir[] memory) {
        return heirs;
    }
}
