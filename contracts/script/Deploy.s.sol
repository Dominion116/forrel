// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";

import {ForrelRegistry} from "../src/ForrelRegistry.sol";

/// @notice Deploy ForrelRegistry and record it in deployments/<network>.json.
/// @dev Run from contracts/ (the deployer needs a registered ML-DSA-87 key and an open EVM window;
///      check with `npm run window -- status`):
///
///        forge script script/Deploy.s.sol --rpc-url qorechain_testnet --broadcast
///
///      Reads PRIVATE_KEY from contracts/.env. The deployment file is only written for Diana
///      (chain 9800) and only when broadcasting, so dry runs never overwrite it.
contract Deploy is Script {
    uint256 internal constant DIANA_CHAIN_ID = 9800;

    function run() external returns (ForrelRegistry registry) {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);
        console2.log("chain id ", block.chainid);
        console2.log("deployer ", deployer);

        vm.startBroadcast(key);
        registry = new ForrelRegistry();
        vm.stopBroadcast();

        console2.log("ForrelRegistry", address(registry));

        if (block.chainid == DIANA_CHAIN_ID && vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) {
            string memory obj = "deployment";
            vm.serializeString(obj, "network", "qorechain-diana");
            vm.serializeUint(obj, "chainId", block.chainid);
            vm.serializeAddress(obj, "deployer", deployer);
            vm.serializeUint(obj, "deployedAtBlock", block.number);
            vm.serializeUint(obj, "deployedAt", block.timestamp);
            string memory json = vm.serializeAddress(obj, "ForrelRegistry", address(registry));
            string memory path = string.concat(vm.projectRoot(), "/../deployments/diana.json");
            vm.writeJson(json, path);
            console2.log("wrote", path);
        }
    }
}
