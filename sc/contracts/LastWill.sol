// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./WillEscrow.sol";
import "./WillRegistry.sol";
import "./WillFactory.sol";

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
    event TokensTransferredToEscrow(address indexed token, uint256 amount, address indexed from);
    event ExcessNativeTokenReturned(address indexed recipient, uint256 amount);
    event TokensReturnedFromEscrow(address indexed token, uint256 amount, address indexed to);
    event NativeTokensReturnedFromEscrow(address indexed to, uint256 amount);

    error NotOwner();
    error NotFactory();
    error NotOwnerOrFactory();
    error AlreadyExecuted();
    error NotDueYet();
    error AlreadyInitialized();
    error InvalidDueDate();
    error InvalidHeirIndex();
    error HeirAlreadyExists();
    error ArraysNotSameSize();
    error TokenNotWhitelisted();
    error AmountMustBeGreaterThanZero();
    error HeirNotFound();
    error NativeTokenAmountMismatch();
    error NotOwnerOrHeir();

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

    modifier onlyOwnerOrHeir(address heir) {
        if (msg.sender != owner && msg.sender != heir) revert NotOwnerOrHeir();
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
        uint256 nativeAmount
    ) external payable onlyOwnerOrFactory {
        // Check if wallet is already a heir
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i].wallet == wallet) revert HeirAlreadyExists();
        }

        // Check if arrays have same size
        if (tokens.length != amounts.length) revert ArraysNotSameSize();

        // Check if all tokens are whitelisted and amounts are valid
        for (uint256 i = 0; i < tokens.length; i++) {
            (bool allowed, ) = WillFactory(factory).tokenWhiteList(tokens[i]);
            if (!allowed) revert TokenNotWhitelisted();
            if (amounts[i] == 0) revert AmountMustBeGreaterThanZero();
        }

        // Check if native amount <= msg.value
        if (nativeAmount > msg.value) revert NativeTokenAmountMismatch();

        // Transfer native ETH to escrow
        if (nativeAmount > 0) {
            (bool success, ) = payable(address(escrow)).call{value: nativeAmount}("");
            require(success, "ETH escrow failed");
            escrow.registerDeposit(address(this), address(0), nativeAmount);
        }

        // Return excess native tokens to the sender if any
        uint256 excessAmount = msg.value - nativeAmount;
        if (excessAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: excessAmount}("");
            require(success, "ETH return failed");
            emit ExcessNativeTokenReturned(msg.sender, excessAmount);
        }

        // Transfer ERC20 tokens to escrow
        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0) {
                bool success = IERC20(tokens[i]).transferFrom(msg.sender, address(escrow), amounts[i]);
                require(success, "Token transfer failed");
                escrow.registerDeposit(address(this), tokens[i], amounts[i]);
                emit TokensTransferredToEscrow(tokens[i], amounts[i], msg.sender);
            }
        }

        heirs.push(Heir(wallet, tokens, amounts, nativeAmount));
        emit HeirAdded(wallet, tokens, amounts, nativeAmount);
    }

    function removeHeir(address wallet) external onlyOwner {
        uint256 index = type(uint256).max;
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i].wallet == wallet) {
                index = i;
                break;
            }
        }
        if (index == type(uint256).max) revert HeirNotFound();

        // Get the heir's data before removing
        Heir memory heirToRemove = heirs[index];

        // Return native tokens to owner
        if (heirToRemove.nativeAmounts > 0) {
            escrow.transferETH(address(this), payable(owner), heirToRemove.nativeAmounts);
            emit NativeTokensReturnedFromEscrow(owner, heirToRemove.nativeAmounts);
        }

        // Return ERC20 tokens to owner
        for (uint256 i = 0; i < heirToRemove.tokens.length; i++) {
            if (heirToRemove.amounts[i] > 0) {
                escrow.transferERC20(address(this), heirToRemove.tokens[i], owner, heirToRemove.amounts[i]);
                emit TokensReturnedFromEscrow(heirToRemove.tokens[i], heirToRemove.amounts[i], owner);
            }
        }

        // Remove the heir from the array
        heirs[index] = heirs[heirs.length - 1];
        heirs.pop();
        emit HeirRemoved(index);
    }

    //@todo add modifyHeir function

    //@todo check this  function
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
                    //@todo could cause a revert if wallet is a contract & does not accept ETH
                    escrow.transferETH(address(this), payable(h.wallet), amount);
                } else {
                    escrow.transferERC20(address(this), token, h.wallet, amount);
                }
            }
        }
    }

    // Getter Functions

    function getHeirs() external view onlyOwner returns (Heir[] memory) {
        return heirs;
    }

    function getHeirByAddress(
        address heir
    ) external view onlyOwnerOrHeir(heir) returns (Heir memory, uint256) {
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i].wallet == heir) {
                return (heirs[i], dueDate);
            }
        }
        revert HeirNotFound();
    }

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
