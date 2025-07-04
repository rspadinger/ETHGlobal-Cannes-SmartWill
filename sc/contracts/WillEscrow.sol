// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract WillEscrow {
    error Unauthorized();

    address public factory;
    mapping(address => bool) public authorizedCallers;

    function setFactory(address _factory) external {
        factory = _factory;
        authorizedCallers[factory] = true;
    }

    function authorize(address caller) external {
        if (msg.sender != factory) revert Unauthorized();
        authorizedCallers[caller] = true;
    }

    function transferETH(address payable to, uint256 amount) external {
        if (!authorizedCallers[msg.sender]) revert Unauthorized();

        //@todo check authorized  amounts

        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    function transferERC20(address token, address to, uint256 amount) external {
        if (!authorizedCallers[msg.sender]) revert Unauthorized();

        //@todo check authorized amounts

        require(IERC20(token).transfer(to, amount), "ERC20 transfer failed");
    }

    receive() external payable {}
}
