// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./WillEscrow.sol";
import "./WillRegistry.sol";
import "./WillFactory.sol";

import "hardhat/console.sol";

contract LastWill {
    //we also store the native token in tokens array => address(0)
    struct Heir {
        address wallet;
        address[] tokens;
        uint256[] amounts;
        bool executed;
    }

    address public immutable factory;
    WillRegistry public immutable registry;
    WillEscrow public immutable escrow;

    bool private initialized;
    address public owner;
    uint256 public dueDate;

    Heir[] public heirs;

    event LastWillDeployed(address lastWill);
    event DueDateUpdated(uint256 newDate);
    event HeirAdded(address indexed heir, address[] tokens, uint256[] amounts);
    event HeirRemoved(address indexed heir);
    event TokensTransferredToEscrow(address indexed token, uint256 amount, address indexed from);
    event NativeTokensTransferredToEscrow(uint256 amount, address indexed from);
    event ExcessNativeTokenReturned(address indexed recipient, uint256 amount);
    event TokensReturnedFromEscrow(address indexed token, uint256 amount, address indexed to);
    event NativeTokensReturnedFromEscrow(uint256 amount, address indexed to);

    error NotOwner();
    error NotFactory();
    error NotOwnerOrFactory();
    error AlreadyExecuted();
    error NotDueYet();
    error DueDatePassed();
    error AlreadyInitialized();
    error InvalidDueDate();
    error InvalidHeirIndex();
    error HeirAlreadyExists();
    error ArraysNotSameSize();
    error TokenNotWhitelisted();
    error AmountMustBeGreaterThanZero();
    error HeirNotFound();
    error NotOwnerOrHeir();
    error NotAuthorized();
    error NativeTokenAmountMismatch();

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
        registry = WillRegistry(_registry);
        escrow = WillEscrow(payable(_escrow));
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
        uint256[] calldata amounts
    ) public payable onlyOwner {
        if (block.timestamp > dueDate) revert DueDatePassed();

        // Check if wallet is already a heir
        if (isExistingHeir(wallet)) revert HeirAlreadyExists();

        // Check if arrays have same size
        if (tokens.length != amounts.length) revert ArraysNotSameSize();

        // Check if all tokens are whitelisted and amounts are valid
        for (uint256 i = 0; i < tokens.length; i++) {
            (bool allowed, ) = WillFactory(factory).tokenWhiteList(tokens[i]);
            if (!allowed && tokens[i] != address(0)) revert TokenNotWhitelisted();
            if (amounts[i] == 0) revert AmountMustBeGreaterThanZero();
        }

        // Transfer native ETH to escrow
        if (msg.value > 0) {
            (bool success, ) = payable(address(escrow)).call{value: msg.value}("");
            require(success, "ETH escrow failed");
            escrow.registerDeposit(address(this), address(0), msg.value);
            emit NativeTokensTransferredToEscrow(msg.value, msg.sender);
        }

        //Check if sum of nativeTokenAmountsPerHeir is not greater than msg.value
        uint256 nativeAmount;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) {
                nativeAmount += amounts[i];
                break;
            }
        }

        if (nativeAmount > msg.value) revert NativeTokenAmountMismatch();

        // Return excess native tokens to the sender if any
        uint256 excessAmount = msg.value - nativeAmount;
        if (excessAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: excessAmount}("");
            require(success, "ETH return failed");
            emit ExcessNativeTokenReturned(msg.sender, excessAmount);
        }

        // Transfer ERC20 tokens to escrow
        for (uint256 i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0 && tokens[i] != address(0)) {
                bool success = IERC20(tokens[i]).transferFrom(msg.sender, address(escrow), amounts[i]);
                require(success, "Token transfer failed");

                escrow.registerDeposit(address(this), tokens[i], amounts[i]);
                emit TokensTransferredToEscrow(tokens[i], amounts[i], msg.sender);
            }
        }

        heirs.push(Heir(wallet, tokens, amounts, false));
        emit HeirAdded(wallet, tokens, amounts);
    }

    function removeHeir(address wallet) public onlyOwner {
        if (block.timestamp > dueDate) revert DueDatePassed();

        (Heir memory heirToRemove, uint256 index, , bool found) = getHeirByAddress(wallet);

        if (found) {
            // Return native tokens to owner
            uint256 nativeAmount = getNativeTokenAmount(wallet);
            if (nativeAmount > 0) {
                escrow.transferETH(address(this), payable(owner), nativeAmount);
                emit NativeTokensReturnedFromEscrow(nativeAmount, owner);
            }

            // Return ERC20 tokens to owner
            for (uint256 i = 0; i < heirToRemove.tokens.length; i++) {
                if (heirToRemove.tokens[i] == address(0)) continue;

                if (heirToRemove.amounts[i] > 0) {
                    escrow.transferERC20(
                        address(this),
                        heirToRemove.tokens[i],
                        owner,
                        heirToRemove.amounts[i]
                    );
                    emit TokensReturnedFromEscrow(heirToRemove.tokens[i], heirToRemove.amounts[i], owner);
                }
            }

            // Remove the heir from the array
            heirs[index] = heirs[heirs.length - 1];
            heirs.pop();
            emit HeirRemoved(wallet);
        } else {
            revert HeirNotFound();
        }
    }

    function modifyPlan(
        uint256 _dueDate,
        Heir[] calldata heirsToAdd,
        address[] calldata heirsToDelete
    ) public payable onlyOwner {
        if (block.timestamp > dueDate) revert DueDatePassed();

        // Update due date if changed
        if (_dueDate != dueDate) {
            if (_dueDate <= block.timestamp) revert InvalidDueDate();
            dueDate = _dueDate;
            emit DueDateUpdated(_dueDate);
        }

        // Remove heirs
        for (uint256 i = 0; i < heirsToDelete.length; i++) {
            removeHeir(heirsToDelete[i]);
        }

        // Add new heirs
        for (uint256 i = 0; i < heirsToAdd.length; i++) {
            addHeir(heirsToAdd[i].wallet, heirsToAdd[i].tokens, heirsToAdd[i].amounts);
        }
    }

    //execute lastWill for specific heir
    function executeLastWill(address heirAddress) external {
        //get index because we need a storage heir
        (, uint256 heirIndex, , bool found) = getHeirByAddress(heirAddress);

        if (found) {
            Heir storage h = heirs[heirIndex];

            if (h.executed) revert AlreadyExecuted();
            if (block.timestamp < dueDate) revert NotDueYet();

            h.executed = true;

            for (uint j = 0; j < h.tokens.length; j++) {
                address token = h.tokens[j];
                uint256 amount = h.amounts[j];

                if (token == address(0)) {
                    escrow.transferETH(address(this), payable(h.wallet), amount);
                } else {
                    escrow.transferERC20(address(this), token, h.wallet, amount);
                }
            }
        } else {
            revert HeirNotFound();
        }
    }

    // Getter Functions

    function getHeirs() external view onlyOwner returns (Heir[] memory) {
        return heirs;
    }

    function isExistingHeir(address heir) public view returns (bool) {
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i].wallet == heir) {
                return true;
            }
        }
        return false;
    }

    function getNativeTokenAmount(address heir) public view returns (uint256) {
        (Heir memory h, , , bool found) = getHeirByAddress(heir);

        if (found) {
            for (uint256 i = 0; i < h.tokens.length; i++) {
                if (h.tokens[i] == address(0)) {
                    return h.amounts[i];
                }
            }
        }
        return 0;
    }

    //@todo should maybe be restricted
    function getHeirByAddress(address heir) public view returns (Heir memory, uint256, uint256, bool) {
        for (uint256 i = 0; i < heirs.length; i++) {
            if (heirs[i].wallet == heir) {
                return (heirs[i], i, dueDate, true);
            }
        }

        //nothing found
        Heir memory emptyHeir;
        return (emptyHeir, 0, dueDate, false);
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

            uint256 nativeAmount = getNativeTokenAmount(h.wallet);
            totalNativeAmount += nativeAmount;

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
