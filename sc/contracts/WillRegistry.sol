// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LastWill.sol";
import "hardhat/console.sol";

contract WillRegistry {
    address public factory;
    address[] public wills;
    uint256 public lastCheckedIndex;

    uint256 public constant MAX_WILLS_TO_EXECUTE = 10;

    event WillExecuted(address will);

    function registerWill(address will) external {
        wills.push(will);
    }

    function setFactory(address _factory) external {
        factory = _factory;
    }

    function getWills() external view returns (address[] memory) {
        return wills;
    }

    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        uint256 len = wills.length;
        uint256 maxScan = len < 500 ? len : 500; // Scan up to 500 wills for due dates
        uint256[] memory dueWills = new uint256[](MAX_WILLS_TO_EXECUTE);
        uint256 count = 0;

        for (uint256 i = lastCheckedIndex; i < maxScan && count < MAX_WILLS_TO_EXECUTE; i++) {
            LastWill will = LastWill(wills[i]);
            if (block.timestamp >= will.dueDate()) {
                dueWills[count++] = i;
            }
        }

        if (count > 0) {
            upkeepNeeded = true;
            // Trim the array to actual size by encoding only used part
            uint256[] memory trimmed = new uint256[](count);
            for (uint256 j = 0; j < count; j++) {
                trimmed[j] = dueWills[j];
            }
            performData = abi.encode(trimmed);
        }
    }

    function performUpkeep(bytes calldata performData) external {
        uint256[] memory indexes = abi.decode(performData, (uint256[]));

        for (uint256 i = 0; i < indexes.length; i++) {
            uint256 index = indexes[i];
            if (index >= wills.length) continue;

            address willAddr = wills[index];
            LastWill will = LastWill(willAddr);

            LastWill.Heir[] memory heirStructs = will.getHeirs();
            for (uint256 j = 0; j < heirStructs.length; j++) {
                try will.executeLastWill(heirStructs[j].wallet) {
                    // successful execution
                } catch {
                    // skip failed heir
                }
            }

            _removeWill(index);
            emit WillExecuted(willAddr);
        }

        // Optional: move lastCheckedIndex forward to avoid repeating the same ones
        lastCheckedIndex = (lastCheckedIndex + indexes.length) % wills.length;
    }

    function _removeWill(uint256 index) internal {
        uint256 last = wills.length - 1;
        if (index != last) {
            wills[index] = wills[last];
        }
        wills.pop();
    }
}
