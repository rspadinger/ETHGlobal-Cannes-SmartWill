// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./WillEscrow.sol";
import "./WillRegistry.sol";

import "hardhat/console.sol";

contract LastWill {
    struct Heir {
        address wallet;
        address[] tokens;
        uint256[] amounts;
        uint256 nativeAmounts;
    }

    address public immutable factory;
    WillEscrow public immutable escrow;
    WillRegistry public immutable registry;

    bool private initialized;
    address public owner;
    uint256 public dueDate;
    bool public executed;

    Heir[] public heirs;

    event LastWillDeployed(address lastWill);
    event DueDateUpdated(uint256 newDate);
    event HeirAdded(address indexed heir, address[] tokens, uint256[] amounts, uint256 nativeAmounts);
    event HeirRemoved(uint256 indexed index);

    error NotOwner();
    error NotFactory();
    error NotOwnerOrFactory();
    error AlreadyExecuted();
    error NotDueYet();
    error AlreadyInitialized();
    error InvalidDueDate();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    modifier onlyOwnerOrFactory() {
        if (msg.sender != owner && msg.sender != factory) revert NotOwnerOrFactory();
        _;
    }

    constructor(address _factory, address _escrow, address _registry) {
        factory = _factory;
        escrow = WillEscrow(payable(_escrow));
        registry = WillRegistry(_registry);
    }

    function initialize(address _owner, uint256 _dueDate) external onlyFactory {
        if (initialized) revert AlreadyInitialized();

        initialized = true;
        owner = _owner;
        dueDate = _dueDate;

        emit LastWillDeployed(address(this));
    }

    function updateDueDate(uint256 _dueDate) external onlyOwner {
        if (_dueDate <= block.timestamp) revert InvalidDueDate();

        dueDate = _dueDate;
        emit DueDateUpdated(_dueDate);
    }

    function addHeir(
        address wallet,
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint256 nativeAmounts
    ) external onlyOwnerOrFactory {
        heirs.push(Heir(wallet, tokens, amounts, nativeAmounts));
        emit HeirAdded(wallet, tokens, amounts, nativeAmounts);
    }

    function removeHeir(uint256 index) external onlyOwner {
        require(index < heirs.length, "Invalid index");
        heirs[index] = heirs[heirs.length - 1];
        heirs.pop();
        emit HeirRemoved(index);
    }

    function executeLastWill() external {
        //@todo pay service fee to protocol

        if (executed) revert AlreadyExecuted();
        if (block.timestamp < dueDate) revert NotDueYet();
        executed = true;

        for (uint i = 0; i < heirs.length; i++) {
            Heir memory h = heirs[i];
            for (uint j = 0; j < h.tokens.length; j++) {
                address token = h.tokens[j];
                uint256 amount = h.amounts[j];

                if (token == address(0)) {
                    escrow.transferETH(payable(h.wallet), amount);
                } else {
                    escrow.transferERC20(token, h.wallet, amount);
                }
            }
        }
    }

    function getHeirs() external view returns (Heir[] memory) {
        return heirs;
    }

    // Getter Functions

    function getTotalTokenAmounts()
        external
        view
        onlyOwner
        returns (address[] memory, uint256[] memory, uint256)
    {
        uint256 uniqueTokenCount = 0;
        uint256 totalNativeAmount = 0;

        //@todo for now, I asume, we'll never have more than 10 unique tokens => change this & avoid magic numbers
        address[] memory uniqueTokens = new address[](heirs.length * 10);
        uint256[] memory tokenAmounts = new uint256[](heirs.length * 10);

        for (uint256 i = 0; i < heirs.length; i++) {
            Heir memory h = heirs[i];
            totalNativeAmount += h.nativeAmounts;

            for (uint256 j = 0; j < h.tokens.length; j++) {
                address token = h.tokens[j];
                uint256 amount = h.amounts[j];

                // Find or add token
                bool found = false;
                for (uint256 k = 0; k < uniqueTokenCount; k++) {
                    if (uniqueTokens[k] == token) {
                        tokenAmounts[k] += amount;
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    uniqueTokens[uniqueTokenCount] = token;
                    tokenAmounts[uniqueTokenCount] = amount;
                    uniqueTokenCount++;
                }
            }
        }

        return (uniqueTokens, tokenAmounts, totalNativeAmount);
    }
}
