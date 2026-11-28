// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {ForrelRegistry} from "../src/ForrelRegistry.sol";
import {PQC} from "../src/lib/PQC.sol";
import {SSTORE2} from "../src/lib/SSTORE2.sol";
import {MalformedPrecompile, MockPQCKeyStatus, MockPQCVerifier} from "./mocks/PQCMocks.sol";

/// @dev Unit tests per PRD §12.5. `pqcVerify` and `pqcKeyStatus` are mocks etched at their
///      precompile addresses (see PQCMocks.sol for the toy signature scheme).
contract ForrelRegistryTest is Test {
    address internal constant VERIFY = address(uint160(0x0a01));
    address internal constant KEY_STATUS = address(uint160(0x0a02));

    ForrelRegistry internal reg;
    address internal owner = makeAddr("owner");
    address internal relayer = makeAddr("relayer");
    address internal stranger = makeAddr("stranger");

    string internal constant SLUG = "acme-router";
    bytes32 internal constant ART = keccak256("firmware-2.4.1.bin");
    bytes32 internal constant META = keccak256("release notes");

    bytes internal signingPk;
    bytes internal recoveryPk;
    bytes32 internal pid;

    /* ------------------------------------------------------------ setup & helpers */

    function setUp() public {
        vm.etch(VERIFY, address(new MockPQCVerifier()).code);
        vm.etch(KEY_STATUS, address(new MockPQCKeyStatus()).code);
        MockPQCKeyStatus(KEY_STATUS).set(owner, true, 1, true);

        reg = new ForrelRegistry();
        signingPk = _key(1);
        recoveryPk = _key(2);

        vm.prank(owner);
        pid = reg.registerProject(SLUG, signingPk, recoveryPk);
    }

    /// @dev A deterministic 2,592-byte "public key".
    function _key(uint256 seed) internal pure returns (bytes memory k) {
        k = new bytes(2592);
        for (uint256 i; i < 81; ++i) {
            bytes32 w = keccak256(abi.encode(seed, i));
            assembly ("memory-safe") {
                mstore(add(add(k, 0x20), mul(i, 0x20)), w)
            }
        }
    }

    /// @dev A 4,627-byte mock signature by `pk` over `message`.
    function _sign(bytes memory pk, bytes memory message) internal pure returns (bytes memory sig) {
        sig = new bytes(4627);
        bytes32 h = keccak256(abi.encodePacked(pk, message));
        assembly ("memory-safe") {
            mstore(add(sig, 0x20), h)
        }
    }

    /// @dev PUBLISH_MSG built independently from the contract (the spec, not the implementation).
    function _publishMsg(address registry, bytes32 projectId, uint64 seq, string memory version, bytes32 art, bytes32 meta)
        internal
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "FORREL/v1/PUBLISH", block.chainid, registry, projectId, seq, keccak256(bytes(version)), art, meta
        );
    }

    function _rotateMsg(bytes32 projectId, uint32 epoch, bytes memory newPk, bool viaRecovery)
        internal
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "FORREL/v1/ROTATE", block.chainid, address(reg), projectId, epoch, keccak256(newPk), viaRecovery
        );
    }

    function _revokeMsg(bytes32 projectId, uint256 releaseId, uint8 reason) internal view returns (bytes memory) {
        return abi.encodePacked("FORREL/v1/REVOKE", block.chainid, address(reg), projectId, releaseId, reason);
    }

    function _nextSeq() internal view returns (uint64) {
        return reg.getProject(pid).nextSeq;
    }

    function _publish(string memory version, bytes32 art) internal returns (uint256) {
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, _nextSeq(), version, art, META));
        vm.prank(relayer);
        return reg.publish(pid, version, art, META, sig);
    }

    /* ------------------------------------------------------------ register */

    function test_register_storesProjectAndKeys() public view {
        ForrelRegistry.ProjectView memory p = reg.getProject(pid);
        assertEq(p.projectId, keccak256(bytes(SLUG)));
        assertEq(p.owner, owner);
        assertEq(p.keyEpoch, 1);
        assertEq(p.nextSeq, 1);
        assertEq(p.createdAt, block.timestamp);
        assertEq(p.releaseCount, 0);
        assertEq(p.slug, SLUG);
        assertEq(reg.getPubkey(p.signingKeyPtr), signingPk);
        assertEq(reg.getPubkey(p.recoveryKeyPtr), recoveryPk);
        assertEq(reg.getProjectBySlug(SLUG).projectId, pid);
        (uint256 projects, uint256 releases, uint256 revoked) = reg.stats();
        assertEq(projects, 1);
        assertEq(releases, 0);
        assertEq(revoked, 0);
    }

    function test_register_emitsEvent() public {
        MockPQCKeyStatus(KEY_STATUS).set(stranger, true, 1, true);
        vm.expectEmit(true, true, false, true, address(reg));
        emit ForrelRegistry.ProjectRegistered(keccak256("other-fw"), "other-fw", stranger);
        vm.prank(stranger);
        reg.registerProject("other-fw", _key(10), _key(11));
    }

    function test_register_revertsOnInvalidSlug() public {
        vm.prank(owner);
        vm.expectRevert(ForrelRegistry.InvalidSlug.selector);
        reg.registerProject("Acme", _key(3), _key(4));
    }

    function test_register_revertsWhenSlugTaken() public {
        vm.prank(owner);
        vm.expectRevert(ForrelRegistry.SlugTaken.selector);
        reg.registerProject(SLUG, _key(3), _key(4));
    }

    function test_register_revertsOnBadKeyLength() public {
        vm.startPrank(owner);
        vm.expectRevert(ForrelRegistry.BadKeyLength.selector);
        reg.registerProject("short-key", new bytes(2591), _key(4));
        vm.expectRevert(ForrelRegistry.BadKeyLength.selector);
        reg.registerProject("short-key", _key(3), new bytes(2593));
        vm.stopPrank();
    }

    function test_register_revertsWhenKeysAreEqual() public {
        vm.prank(owner);
        vm.expectRevert(ForrelRegistry.SameKey.selector);
        reg.registerProject("same-keys", _key(3), _key(3));
    }

    function test_register_requiresProvenMlDsa87Owner() public {
        // No key at all.
        vm.prank(stranger);
        vm.expectRevert(ForrelRegistry.OwnerNotPQRegistered.selector);
        reg.registerProject("no-key", _key(3), _key(4));
        // Registered but possession not proven.
        MockPQCKeyStatus(KEY_STATUS).set(stranger, true, 1, false);
        vm.prank(stranger);
        vm.expectRevert(ForrelRegistry.OwnerNotPQRegistered.selector);
        reg.registerProject("no-key", _key(3), _key(4));
        // Proven, but not ML-DSA-87.
        MockPQCKeyStatus(KEY_STATUS).set(stranger, true, 2, true);
        vm.prank(stranger);
        vm.expectRevert(ForrelRegistry.OwnerNotPQRegistered.selector);
        reg.registerProject("no-key", _key(3), _key(4));
    }

    function test_register_revertsWhenKeyStatusPrecompileIsInactive() public {
        vm.etch(KEY_STATUS, "");
        vm.prank(owner);
        vm.expectRevert(PQC.PrecompileUnavailable.selector);
        reg.registerProject("offline", _key(3), _key(4));
    }

    /* ------------------------------------------------------------ publish */

    function test_publish_happyPath() public {
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));

        vm.expectEmit(true, true, true, true, address(reg));
        emit ForrelRegistry.ReleasePublished(0, pid, 1, "2.4.1", ART);
        vm.prank(relayer); // anyone may submit: authority is the signature
        uint256 id = reg.publish(pid, "2.4.1", ART, META, sig);

        assertEq(id, 0);
        ForrelRegistry.Release memory r = reg.getRelease(id);
        assertEq(r.projectId, pid);
        assertEq(r.seq, 1);
        assertEq(r.keyEpoch, 1);
        assertEq(r.publishedAt, block.timestamp);
        assertEq(r.versionHash, keccak256("2.4.1"));
        assertEq(r.artifactHash, ART);
        assertEq(r.metaHash, META);
        assertEq(r.version, "2.4.1");
        assertFalse(r.revoked);
        assertEq(reg.getSignature(id), sig);
        assertEq(reg.getPubkey(r.signingKeyPtr), signingPk);
        assertEq(reg.releaseIdPlusOne(pid, keccak256("2.4.1")), 1);
        assertEq(reg.getProject(pid).nextSeq, 2);
        assertEq(reg.getProject(pid).releaseCount, 1);
        assertTrue(reg.recheck(id));

        uint256[] memory byArt = reg.releasesOfArtifact(ART, 0, 10);
        assertEq(byArt.length, 1);
        assertEq(byArt[0], id);
        uint256[] memory byProject = reg.releasesOfProject(pid, 0, 10);
        assertEq(byProject.length, 1);
    }

    function test_publish_messageMatchesSpec() public view {
        bytes memory fromContract = reg.publishMessage(pid, 7, "2.4.1", ART, META);
        assertEq(fromContract, _publishMsg(address(reg), pid, 7, "2.4.1", ART, META));
        assertEq(fromContract.length, 17 + 32 + 20 + 32 + 8 + 32 + 32 + 32);
    }

    function test_publish_sequenceAdvances() public {
        _publish("1.0.0", keccak256("a"));
        _publish("1.0.1", keccak256("b"));
        assertEq(reg.getRelease(1).seq, 2);
        assertEq(_nextSeq(), 3);
    }

    function test_publish_revertsOnUnknownProject() public {
        vm.expectRevert(ForrelRegistry.UnknownProject.selector);
        reg.publish(keccak256("nope"), "1.0.0", ART, META, new bytes(4627));
    }

    function test_publish_revertsOnInvalidVersion() public {
        vm.expectRevert(ForrelRegistry.InvalidVersion.selector);
        reg.publish(pid, "", ART, META, new bytes(4627));
        vm.expectRevert(ForrelRegistry.InvalidVersion.selector);
        reg.publish(pid, string(new bytes(65)), ART, META, new bytes(4627));
    }

    function test_publish_revertsOnDuplicateVersion() public {
        _publish("2.4.1", ART);
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 2, "2.4.1", keccak256("x"), META));
        vm.expectRevert(ForrelRegistry.VersionExists.selector);
        reg.publish(pid, "2.4.1", keccak256("x"), META, sig);
    }

    function test_publish_revertsOnBadSignatureLength() public {
        vm.expectRevert(ForrelRegistry.BadSigLength.selector);
        reg.publish(pid, "1.0.0", ART, META, new bytes(4626));
    }

    function test_publish_revertsWhenSignedByWrongKey() public {
        bytes memory sig = _sign(recoveryPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, META, sig);
    }

    function test_publish_revertsOnEachTamperedField() public {
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.2", ART, META, sig); // version
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", keccak256("evil.bin"), META, sig); // artifactHash
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, keccak256("other notes"), sig); // metaHash
    }

    function test_publish_revertsOnReplayedOldSeq() public {
        // Signed for seq 1 but submitted after seq 1 was used: the contract signs over seq 2.
        bytes memory stale = _sign(signingPk, _publishMsg(address(reg), pid, 1, "9.9.9", ART, META));
        _publish("1.0.0", keccak256("first"));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "9.9.9", ART, META, stale);
    }

    function test_publish_revertsOnCrossDeploymentReplay() public {
        // Signed for another registry address.
        bytes memory other = _sign(signingPk, _publishMsg(address(0xBEEF), pid, 1, "2.4.1", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, META, other);
        // Signed for another chain.
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.chainId(1);
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, META, sig);
    }

    function test_publish_revertsWhenVerifyPrecompileIsInactive() public {
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.etch(VERIFY, ""); // inactive precompile: success with empty return data
        vm.expectRevert(PQC.PrecompileUnavailable.selector);
        reg.publish(pid, "2.4.1", ART, META, sig);
    }

    function test_publish_revertsWhenVerifyPrecompileReturnsGarbage() public {
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.etch(VERIFY, address(new MalformedPrecompile()).code);
        vm.expectRevert(PQC.PrecompileUnavailable.selector);
        reg.publish(pid, "2.4.1", ART, META, sig);
    }

    function testFuzz_publish_tamperedArtifactIsRejected(bytes32 other) public {
        vm.assume(other != ART);
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", other, META, sig);
    }

    function testFuzz_publish_tamperedMetaIsRejected(bytes32 other) public {
        vm.assume(other != META);
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, other, sig);
    }

    function testFuzz_publish_tamperedSignatureIsRejected(uint256 index, bytes1 flip) public {
        vm.assume(flip != 0x00);
        index = bound(index, 0, 31); // the bytes the mock checks
        bytes memory sig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "2.4.1", ART, META));
        sig[index] = sig[index] ^ flip;
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "2.4.1", ART, META, sig);
    }

    /* ------------------------------------------------------------ rotate */

    function test_rotate_withCurrentKey() public {
        bytes memory newPk = _key(5);
        bytes memory sig = _sign(signingPk, _rotateMsg(pid, 1, newPk, false));

        vm.expectEmit(true, false, false, true, address(reg));
        emit ForrelRegistry.KeyRotated(pid, 2, false);
        vm.prank(relayer);
        reg.rotateKey(pid, newPk, false, sig);

        ForrelRegistry.ProjectView memory p = reg.getProject(pid);
        assertEq(p.keyEpoch, 2);
        assertEq(reg.getPubkey(p.signingKeyPtr), newPk);

        // The rotation is kept in storage (not only in the event log).
        ForrelRegistry.Rotation[] memory rot = reg.getRotations(pid);
        assertEq(rot.length, 1);
        assertEq(rot[0].epoch, 2);
        assertEq(rot[0].keyPtr, p.signingKeyPtr);
        assertEq(rot[0].rotatedAt, block.timestamp);
        assertFalse(rot[0].viaRecovery);

        // New key publishes; old key no longer does.
        bytes memory oldSig = _sign(signingPk, _publishMsg(address(reg), pid, 1, "3.0.0", ART, META));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "3.0.0", ART, META, oldSig);
        bytes memory newSig = _sign(newPk, _publishMsg(address(reg), pid, 1, "3.0.0", ART, META));
        uint256 id = reg.publish(pid, "3.0.0", ART, META, newSig);
        assertEq(reg.getRelease(id).keyEpoch, 2);
    }

    function test_rotate_withRecoveryKey() public {
        bytes memory newPk = _key(6);
        bytes memory sig = _sign(recoveryPk, _rotateMsg(pid, 1, newPk, true));
        reg.rotateKey(pid, newPk, true, sig);
        assertEq(reg.getProject(pid).keyEpoch, 2);
        assertEq(reg.getPubkey(reg.getProject(pid).signingKeyPtr), newPk);
        assertTrue(reg.getRotations(pid)[0].viaRecovery);
    }

    function test_rotations_accumulateInOrder() public {
        assertEq(reg.getRotations(pid).length, 0);
        bytes memory k2 = _key(5);
        reg.rotateKey(pid, k2, false, _sign(signingPk, _rotateMsg(pid, 1, k2, false)));
        bytes memory k3 = _key(6);
        reg.rotateKey(pid, k3, true, _sign(recoveryPk, _rotateMsg(pid, 2, k3, true)));
        ForrelRegistry.Rotation[] memory rot = reg.getRotations(pid);
        assertEq(rot.length, 2);
        assertEq(rot[0].epoch, 2);
        assertEq(reg.getPubkey(rot[0].keyPtr), k2);
        assertEq(rot[1].epoch, 3);
        assertEq(reg.getPubkey(rot[1].keyPtr), k3);
        assertTrue(rot[1].viaRecovery);
    }

    function test_rotate_messageMatchesSpec() public view {
        bytes memory newPk = _key(7);
        assertEq(reg.rotateMessage(pid, 3, newPk, true), _rotateMsg(pid, 3, newPk, true));
        assertEq(reg.rotateMessage(pid, 3, newPk, true).length, 16 + 32 + 20 + 32 + 4 + 32 + 1);
    }

    function test_rotate_revertsOnReplayedOldEpoch() public {
        bytes memory first = _key(5);
        reg.rotateKey(pid, first, false, _sign(signingPk, _rotateMsg(pid, 1, first, false)));
        // A second rotation signed by the recovery key for epoch 1 (stale) must fail at epoch 2.
        bytes memory second = _key(6);
        bytes memory stale = _sign(recoveryPk, _rotateMsg(pid, 1, second, true));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.rotateKey(pid, second, true, stale);
    }

    function test_rotate_revertsWhenAuthorityDoesNotMatchPath() public {
        bytes memory newPk = _key(5);
        // Claims the recovery path but was signed by the signing key.
        bytes memory sig = _sign(signingPk, _rotateMsg(pid, 1, newPk, true));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.rotateKey(pid, newPk, true, sig);
        // viaRecovery is signed too: flipping it invalidates the signature.
        bytes memory sig2 = _sign(signingPk, _rotateMsg(pid, 1, newPk, false));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.rotateKey(pid, newPk, true, sig2);
    }

    function test_rotate_revertsOnSameKey() public {
        vm.expectRevert(ForrelRegistry.SameKey.selector);
        reg.rotateKey(pid, signingPk, false, _sign(signingPk, _rotateMsg(pid, 1, signingPk, false)));
        vm.expectRevert(ForrelRegistry.SameKey.selector);
        reg.rotateKey(pid, recoveryPk, false, _sign(signingPk, _rotateMsg(pid, 1, recoveryPk, false)));
    }

    function test_rotate_revertsOnBadLengths() public {
        vm.expectRevert(ForrelRegistry.BadKeyLength.selector);
        reg.rotateKey(pid, new bytes(100), false, new bytes(4627));
        vm.expectRevert(ForrelRegistry.BadSigLength.selector);
        reg.rotateKey(pid, _key(5), false, new bytes(1));
    }

    function test_rotate_revertsOnUnknownProject() public {
        vm.expectRevert(ForrelRegistry.UnknownProject.selector);
        reg.rotateKey(keccak256("nope"), _key(5), false, new bytes(4627));
    }

    /* ------------------------------------------------------------ revoke */

    function test_revoke_happyPath() public {
        uint256 id = _publish("2.4.1", ART);
        bytes memory sig = _sign(signingPk, _revokeMsg(pid, id, 2));

        vm.expectEmit(true, false, false, true, address(reg));
        emit ForrelRegistry.ReleaseRevoked(id, 2);
        vm.prank(relayer);
        reg.revoke(id, 2, sig);

        ForrelRegistry.Release memory r = reg.getRelease(id);
        assertTrue(r.revoked);
        assertEq(r.revokeReason, 2);
        assertEq(r.revokedAt, block.timestamp);
        assertEq(reg.revokedCount(), 1);
        // Still findable: revoked releases are never hidden.
        assertEq(reg.releasesOfArtifact(ART, 0, 10).length, 1);
    }

    function test_revoke_messageMatchesSpec() public view {
        assertEq(reg.revokeMessage(pid, 9, 1), _revokeMsg(pid, 9, 1));
        assertEq(reg.revokeMessage(pid, 9, 1).length, 16 + 32 + 20 + 32 + 32 + 1);
    }

    function test_revoke_revertsWhenRevokedTwice() public {
        uint256 id = _publish("2.4.1", ART);
        bytes memory sig = _sign(signingPk, _revokeMsg(pid, id, 2));
        reg.revoke(id, 2, sig);
        vm.expectRevert(ForrelRegistry.AlreadyRevoked.selector);
        reg.revoke(id, 2, sig);
    }

    function test_revoke_revertsOnBadInputs() public {
        uint256 id = _publish("2.4.1", ART);
        vm.expectRevert(ForrelRegistry.UnknownRelease.selector);
        reg.revoke(id + 1, 1, new bytes(4627));
        vm.expectRevert(ForrelRegistry.InvalidReason.selector);
        reg.revoke(id, 4, new bytes(4627));
        vm.expectRevert(ForrelRegistry.BadSigLength.selector);
        reg.revoke(id, 1, new bytes(10));
    }

    function test_revoke_revertsWhenSignedByRecoveryOrOldKey() public {
        uint256 id = _publish("2.4.1", ART);
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.revoke(id, 1, _sign(recoveryPk, _revokeMsg(pid, id, 1)));

        bytes memory newPk = _key(5);
        reg.rotateKey(pid, newPk, false, _sign(signingPk, _rotateMsg(pid, 1, newPk, false)));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.revoke(id, 1, _sign(signingPk, _revokeMsg(pid, id, 1)));
        reg.revoke(id, 1, _sign(newPk, _revokeMsg(pid, id, 1)));
        assertTrue(reg.getRelease(id).revoked);
    }

    function test_revoke_reasonIsSigned() public {
        uint256 id = _publish("2.4.1", ART);
        bytes memory sig = _sign(signingPk, _revokeMsg(pid, id, 3));
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.revoke(id, 1, sig);
    }

    /* ------------------------------------------------------------ ownership */

    function test_transferOwnership_byOwner() public {
        vm.expectEmit(true, true, true, true, address(reg));
        emit ForrelRegistry.OwnershipTransferred(pid, owner, stranger);
        vm.prank(owner);
        reg.transferOwnership(pid, stranger);
        assertEq(reg.getProject(pid).owner, stranger);
    }

    function test_transferOwnership_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(ForrelRegistry.NotOwner.selector);
        reg.transferOwnership(pid, stranger);
    }

    function test_transferOwnership_revertsOnZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ForrelRegistry.ZeroAddress.selector);
        reg.transferOwnership(pid, address(0));
    }

    function test_transferOwnership_grantsNoSigningPower() public {
        vm.prank(owner);
        reg.transferOwnership(pid, stranger);
        // The new owner still cannot publish without the ML-DSA-87 key.
        bytes memory sig = _sign(_key(99), _publishMsg(address(reg), pid, 1, "1.0.0", ART, META));
        vm.prank(stranger);
        vm.expectRevert(ForrelRegistry.SignatureInvalid.selector);
        reg.publish(pid, "1.0.0", ART, META, sig);
    }

    /* ------------------------------------------------------------ views & pagination */

    function test_views_paginate() public {
        MockPQCKeyStatus(KEY_STATUS).set(stranger, true, 1, true);
        vm.startPrank(stranger);
        reg.registerProject("second-fw", _key(20), _key(21));
        reg.registerProject("third-fw", _key(22), _key(23));
        vm.stopPrank();

        bytes32[] memory all = reg.listProjects(0, 10);
        assertEq(all.length, 3);
        assertEq(all[0], pid);
        bytes32[] memory page = reg.listProjects(1, 1);
        assertEq(page.length, 1);
        assertEq(page[0], keccak256("second-fw"));
        assertEq(reg.listProjects(5, 10).length, 0);

        _publish("1.0.0", ART);
        _publish("1.0.1", ART); // same bytes, two versions
        assertEq(reg.releasesOfArtifact(ART, 0, 10).length, 2);
        assertEq(reg.releasesOfArtifact(ART, 1, 10)[0], 1);
        assertEq(reg.releasesOfArtifact(ART, 2, 10).length, 0);
        assertEq(reg.releasesOfProject(pid, 0, 1).length, 1);
        assertEq(reg.releasesOfProject(pid, 9, 1).length, 0);
    }

    function test_views_revertOnUnknownIds() public {
        vm.expectRevert(ForrelRegistry.UnknownRelease.selector);
        reg.getRelease(0);
        vm.expectRevert(ForrelRegistry.UnknownRelease.selector);
        reg.getSignature(0);
        vm.expectRevert(ForrelRegistry.UnknownRelease.selector);
        reg.recheck(0);
        vm.expectRevert(ForrelRegistry.UnknownProject.selector);
        reg.getProject(keccak256("nope"));
        vm.expectRevert(ForrelRegistry.UnknownProject.selector);
        reg.getProjectBySlug("nope");
        vm.expectRevert(ForrelRegistry.UnknownProject.selector);
        reg.getRotations(keccak256("nope"));
        vm.expectRevert(SSTORE2.InvalidPointer.selector);
        reg.getPubkey(address(0xdead));
    }

    function test_recheck_failsWhenPrecompileSaysNo() public {
        uint256 id = _publish("2.4.1", ART);
        assertTrue(reg.recheck(id));
        // A verifier that rejects everything.
        vm.mockCall(VERIFY, abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)"), abi.encode(false));
        assertFalse(reg.recheck(id));
    }

    /* ------------------------------------------------------------ slug validator */

    function test_isValidSlug_examples() public view {
        assertTrue(reg.isValidSlug("abc"));
        assertTrue(reg.isValidSlug("acme-router-2"));
        assertTrue(reg.isValidSlug("0123456789012345678901234567890123456789")); // 40
        assertFalse(reg.isValidSlug("ab"));
        assertFalse(reg.isValidSlug("01234567890123456789012345678901234567890")); // 41
        assertFalse(reg.isValidSlug("Acme"));
        assertFalse(reg.isValidSlug("acme_router"));
        assertFalse(reg.isValidSlug("acme router"));
        assertFalse(reg.isValidSlug(unicode"acmé"));
    }

    /// @dev Reference implementation of ^[a-z0-9-]{3,40}$ for differential fuzzing.
    function _refValid(bytes memory b) internal pure returns (bool) {
        if (b.length < 3 || b.length > 40) return false;
        for (uint256 i; i < b.length; ++i) {
            uint8 c = uint8(b[i]);
            if (!((c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c == 45)) return false;
        }
        return true;
    }

    function testFuzz_isValidSlug_matchesReference(bytes calldata raw) public view {
        assertEq(reg.isValidSlug(string(raw)), _refValid(raw));
    }

    function testFuzz_isValidSlug_acceptsGeneratedSlugs(uint256 seed, uint8 len) public view {
        len = uint8(bound(len, 3, 40));
        bytes memory alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-";
        bytes memory s = new bytes(len);
        for (uint256 i; i < len; ++i) {
            s[i] = alphabet[uint256(keccak256(abi.encode(seed, i))) % alphabet.length];
        }
        assertTrue(reg.isValidSlug(string(s)));
    }

    function testFuzz_register_onlyValidSlugs(bytes calldata raw) public {
        vm.assume(raw.length <= 64);
        vm.assume(keccak256(raw) != keccak256(bytes(SLUG)));
        vm.prank(owner);
        if (_refValid(raw)) {
            bytes32 id = reg.registerProject(string(raw), _key(30), _key(31));
            assertEq(id, keccak256(raw));
        } else {
            vm.expectRevert(ForrelRegistry.InvalidSlug.selector);
            reg.registerProject(string(raw), _key(30), _key(31));
        }
    }
}
