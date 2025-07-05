// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./LastWill.sol";
import "hardhat/console.sol";

contract WillRegistry is AutomationCompatibleInterface, Ownable {
    uint256 public constant MAX_SCAN_SIZE = 500;
    uint256 public constant MAX_WILLS_TO_EXECUTE = 10;

    address public factory;
    address[] public registeredWills;
    uint256 public lastCheckedIndex;

    event WillExecuted(address will);

    error NotFactory();

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    constructor() Ownable(msg.sender) {}

    function registerWill(address will) external onlyFactory {
        registeredWills.push(will);
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    function getWills() external view returns (address[] memory) {
        return registeredWills;
    }

    function checkUpkeep(
        bytes calldata
    ) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 len = registeredWills.length;
        if (len == 0) return (false, "");

        uint256[] memory dueWillIndexes = new uint256[](MAX_WILLS_TO_EXECUTE);
        uint256 count = 0;
        uint256 scanned = 0;
        uint256 i = lastCheckedIndex;

        while (scanned < MAX_SCAN_SIZE && count < MAX_WILLS_TO_EXECUTE) {
            LastWill will = LastWill(registeredWills[i]);
            if (block.timestamp >= will.dueDate()) {
                dueWillIndexes[count] = i;
                count++;
                upkeepNeeded = true;
            }

            //return to 0 when we reach the  end
            i = (i + 1) % len;
            scanned++;

            // Prevent infinite loop if all wills are scanned
            if (scanned == len) break;
        }

        if (upkeepNeeded) {
            performData = abi.encode(dueWillIndexes, count, i); // pass `i` for next index
        }

        if (upkeepNeeded) {
            performData = abi.encode(dueWillIndexes, count);
        }

        return (upkeepNeeded, performData);
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory indexes, uint256 count, uint256 nextIndex) = abi.decode(
            performData,
            (uint256[], uint256, uint256)
        );
        lastCheckedIndex = nextIndex;

        for (uint256 k = 0; k < count; k++) {
            uint256 index = indexes[k];
            if (index >= registeredWills.length) continue;

            LastWill will = LastWill(registeredWills[index]);

            // Try/catch per heir
            try will.getHeirs() returns (LastWill.Heir[] memory heirs) {
                for (uint256 j = 0; j < heirs.length; j++) {
                    try will.executeLastWill(heirs[j].wallet) {
                        // success
                    } catch {
                        // heir execution failed (e.g. already executed)
                    }
                }

                emit WillExecuted(address(will));

                // cleanup by deleting will
                registeredWills[index] = registeredWills[registeredWills.length - 1];
                registeredWills.pop();
            } catch {
                // failed to get heirs; skip this will
            }
        }
    }
}
