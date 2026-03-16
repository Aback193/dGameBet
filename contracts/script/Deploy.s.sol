// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BetFactory} from "../src/BetFactory.sol";

/// @title DeployScript
/// @notice Deployment script for BetFactory contract
contract DeployScript is Script {
    function run() public returns (BetFactory factory) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("Deploying BetFactory...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        factory = new BetFactory();

        vm.stopBroadcast();

        console.log("BetFactory deployed at:", address(factory));
    }
}
