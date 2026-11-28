// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {ForrelRegistry} from "../src/ForrelRegistry.sol";
import {MockPQCKeyStatus} from "./mocks/PQCMocks.sol";

/// @notice Feeds the real ML-DSA-87 vector from the on-chain gate into the registry.
/// @dev packages/core/vectors/signatures.json holds a real 2,592-byte public key and 4,627-byte
///      signature that Diana's `pqcVerify` precompile returned `true` for (see scripts/pqc-gate.ts).
///      Forked execution can't run that precompile, so this test proves the other half: the
///      registry hands `pqcVerify` exactly those bytes (key read back from SSTORE2, signature, and
///      the PUBLISH message it rebuilds), so a signature that passes the gate passes on-chain.
contract RealSignatureVectorTest is Test {
    address internal constant VERIFY = address(uint160(0x0a01));
    address internal constant KEY_STATUS = address(uint160(0x0a02));

    ForrelRegistry internal reg;
    string internal sigs;
    string internal msgs;
    address internal owner = makeAddr("owner");

    function setUp() public {
        string memory dir = string.concat(vm.projectRoot(), "/../packages/core/vectors/");
        sigs = vm.readFile(string.concat(dir, "signatures.json"));
        msgs = vm.readFile(string.concat(dir, "messages.json"));

        vm.chainId(vm.parseJsonUint(msgs, ".publish.input.chainId"));
        address at = vm.parseJsonAddress(msgs, ".publish.input.registry");
        deployCodeTo("ForrelRegistry.sol:ForrelRegistry", at);
        reg = ForrelRegistry(at);

        vm.etch(KEY_STATUS, address(new MockPQCKeyStatus()).code);
        MockPQCKeyStatus(KEY_STATUS).set(owner, true, 1, true);
    }

    function test_vectorShapes() public view {
        assertEq(vm.parseJsonBytes(sigs, ".publicKey").length, 2592);
        assertEq(vm.parseJsonBytes(sigs, ".signature").length, 4627);
        assertEq(vm.parseJsonBytes(sigs, ".message"), vm.parseJsonBytes(msgs, ".publish.message"));
        assertTrue(vm.parseJsonBool(sigs, ".gate.passed"));
    }

    function test_registryPassesTheGateBytesToPqcVerify() public {
        bytes memory pk = vm.parseJsonBytes(sigs, ".publicKey");
        bytes memory sig = vm.parseJsonBytes(sigs, ".signature");
        bytes memory message = vm.parseJsonBytes(sigs, ".message");
        string memory slug = vm.parseJsonString(msgs, ".slug");
        uint64 seq = uint64(vm.parseJsonUint(msgs, ".publish.input.seq"));

        // Any well-formed verify call answers true while we advance to the vector's seq.
        vm.mockCall(VERIFY, abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)"), abi.encode(true));

        vm.prank(owner);
        bytes32 pid = reg.registerProject(slug, pk, _otherKey());
        assertEq(pid, vm.parseJsonBytes32(msgs, ".publish.input.projectId"));
        for (uint64 i = 1; i < seq; ++i) {
            reg.publish(pid, string.concat("0.0.", vm.toString(i)), bytes32(uint256(i)), bytes32(0), new bytes(4627));
        }
        assertEq(reg.getProject(pid).nextSeq, seq);

        // The publish with the real signature must call pqcVerify with exactly the gate's bytes.
        bytes memory expected = abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)", pk, sig, message);
        vm.expectCall(VERIFY, expected);
        uint256 id = reg.publish(
            pid,
            vm.parseJsonString(msgs, ".publish.input.version"),
            vm.parseJsonBytes32(msgs, ".publish.input.artifactHash"),
            vm.parseJsonBytes32(msgs, ".publish.input.metaHash"),
            sig
        );

        assertEq(reg.getSignature(id), sig);
        assertEq(reg.getPubkey(reg.getRelease(id).signingKeyPtr), pk);
        // recheck rebuilds the same message from storage and calls pqcVerify with the same bytes.
        vm.expectCall(VERIFY, expected);
        assertTrue(reg.recheck(id));
    }

    /// @dev Any 2,592-byte key that differs from the vector key.
    function _otherKey() internal pure returns (bytes memory k) {
        k = new bytes(2592);
        k[0] = 0x01;
    }
}
