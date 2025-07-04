// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LastWill.sol";

import "hardhat/console.sol";

contract WillRegistry {
    address public factory;
    address[] public wills;

    event WillExecuted(address will);

    function registerWill(address will) external {
        wills.push(will);
    }

    function setFactory(address _factory) external {
        factory = _factory;
    }

    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        //@todo setup CL upkeep => check if any wills need  to be executed => provide arr of indexes

        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external {
        //@todo get indexes from performData & execute wills
        //emit WillExecuted(address(willAddr));
    }

    function getWills() external view returns (address[] memory) {
        return wills;
    }
}
