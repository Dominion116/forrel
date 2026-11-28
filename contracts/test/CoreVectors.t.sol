// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {ForrelRegistry} from "../src/ForrelRegistry.sol";

/// @notice The contract must rebuild exactly the bytes the core package signs, or every real
///         signature would fail on-chain. These vectors come from packages/core
///         (run the `vectors` script of packages/core), so both sides are pinned to one file.
contract CoreVectorsTest is Test {
    ForrelRegistry internal reg;
    string internal json;

    function setUp() public {
        json = vm.readFile(string.concat(vm.projectRoot(), "/../packages/core/vectors/messages.json"));
        // The vectors bind chain 9800 and the mock registry address, so deploy there.
        vm.chainId(vm.parseJsonUint(json, ".publish.input.chainId"));
        address at = vm.parseJsonAddress(json, ".publish.input.registry");
        deployCodeTo("ForrelRegistry.sol:ForrelRegistry", at);
        reg = ForrelRegistry(at);
    }

    function test_projectIdIsKeccakOfSlug() public view {
        assertEq(
            keccak256(bytes(vm.parseJsonString(json, ".slug"))), vm.parseJsonBytes32(json, ".publish.input.projectId")
        );
    }

    function test_publishMessageMatchesCore() public view {
        bytes memory fromContract = reg.publishMessage(
            vm.parseJsonBytes32(json, ".publish.input.projectId"),
            uint64(vm.parseJsonUint(json, ".publish.input.seq")),
            vm.parseJsonString(json, ".publish.input.version"),
            vm.parseJsonBytes32(json, ".publish.input.artifactHash"),
            vm.parseJsonBytes32(json, ".publish.input.metaHash")
        );
        assertEq(fromContract, vm.parseJsonBytes(json, ".publish.message"));
    }

    function test_rotateMessageMatchesCore() public view {
        bytes memory newPubkey = new bytes(2592);
        for (uint256 i; i < newPubkey.length; ++i) {
            newPubkey[i] = 0x11;
        }
        bytes memory fromContract = reg.rotateMessage(
            vm.parseJsonBytes32(json, ".rotate.input.projectId"),
            uint32(vm.parseJsonUint(json, ".rotate.input.keyEpoch")),
            newPubkey,
            vm.parseJsonBool(json, ".rotate.input.viaRecovery")
        );
        assertEq(fromContract, vm.parseJsonBytes(json, ".rotate.message"));
    }

    function test_revokeMessageMatchesCore() public view {
        bytes memory fromContract = reg.revokeMessage(
            vm.parseJsonBytes32(json, ".revoke.input.projectId"),
            vm.parseJsonUint(json, ".revoke.input.releaseId"),
            uint8(vm.parseJsonUint(json, ".revoke.input.reason"))
        );
        assertEq(fromContract, vm.parseJsonBytes(json, ".revoke.message"));
    }
}
