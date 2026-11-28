// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PQC} from "./lib/PQC.sol";
import {SSTORE2} from "./lib/SSTORE2.sol";

/// @title ForrelRegistry
/// @notice Append-only log of software and firmware releases on QoreChain. A release is accepted
///         only when its ML-DSA-87 signature passes the `pqcVerify` precompile, so the log can only
///         ever hold valid post-quantum signatures (PRD §12).
/// @dev Authority comes from signatures, not from `msg.sender`: anyone (a relayer, a CI runner)
///      may submit publish / rotate / revoke as long as the ML-DSA-87 signature is valid.
///      Signed messages are `abi.encodePacked` and match the core package (packages/core) byte for byte:
///
///        PUBLISH = "FORREL/v1/PUBLISH" ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
///                  ‖ uint64 seq ‖ bytes32 keccak256(version) ‖ bytes32 artifactHash ‖ bytes32 metaHash
///        ROTATE  = "FORREL/v1/ROTATE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
///                  ‖ uint32 keyEpoch (current, before rotating) ‖ bytes32 keccak256(newPubkey) ‖ bool viaRecovery
///        REVOKE  = "FORREL/v1/REVOKE"  ‖ uint256 chainId ‖ address registry ‖ bytes32 projectId
///                  ‖ uint256 releaseId ‖ uint8 reason
///
///      Everything verification needs lives in storage (keys and signatures via SSTORE2), so the
///      registry keeps working when old event logs are pruned.
contract ForrelRegistry {
    /* ---------------------------------------------------------------- constants */

    uint256 public constant PUBKEY_BYTES = 2592; // ML-DSA-87 public key (FIPS 204)
    uint256 public constant SIGNATURE_BYTES = 4627; // ML-DSA-87 signature (FIPS 204)
    uint256 public constant MAX_VERSION_BYTES = 64;
    uint8 public constant MAX_REASON = 3; // 0 unspecified, 1 key compromised, 2 critical bug, 3 superseded

    bytes internal constant PUBLISH_DOMAIN = "FORREL/v1/PUBLISH";
    bytes internal constant ROTATE_DOMAIN = "FORREL/v1/ROTATE";
    bytes internal constant REVOKE_DOMAIN = "FORREL/v1/REVOKE";

    /* ---------------------------------------------------------------- types */

    struct Project {
        address owner;
        address signingKeyPtr; // SSTORE2 pointer to the 2,592-byte signing public key
        address recoveryKeyPtr; // SSTORE2 pointer to the 2,592-byte recovery public key
        uint32 keyEpoch; // increments on rotation, starts at 1
        uint64 nextSeq; // sequence number the next release must sign, starts at 1
        uint64 createdAt;
        string slug;
    }

    struct Release {
        bytes32 projectId;
        uint64 seq;
        uint32 keyEpoch;
        uint64 publishedAt;
        bytes32 versionHash;
        bytes32 artifactHash; // SHA3-256 (FIPS 202) of the artifact
        bytes32 metaHash; // SHA3-256 of the release notes, or zero
        address signaturePtr; // SSTORE2 pointer to the 4,627-byte signature
        address signingKeyPtr; // the key that signed it (pointer snapshot)
        bool revoked;
        uint8 revokeReason;
        uint64 revokedAt;
        string version;
    }

    /// @notice Flat project view for clients (includes the derived ID and release count).
    struct ProjectView {
        bytes32 projectId;
        address owner;
        address signingKeyPtr;
        address recoveryKeyPtr;
        uint32 keyEpoch;
        uint64 nextSeq;
        uint64 createdAt;
        uint256 releaseCount;
        string slug;
    }

    /* ---------------------------------------------------------------- storage */

    mapping(bytes32 projectId => Project) internal _projects;
    Release[] internal _releases;
    /// @notice releaseId + 1 for (projectId, versionHash); 0 means the version is unused.
    mapping(bytes32 projectId => mapping(bytes32 versionHash => uint256)) public releaseIdPlusOne;
    mapping(bytes32 artifactHash => uint256[]) internal _releasesByArtifact;
    mapping(bytes32 projectId => uint256[]) internal _releasesByProject;
    bytes32[] internal _projectIds;
    uint256 public revokedCount;

    /* ---------------------------------------------------------------- events */

    event ProjectRegistered(bytes32 indexed projectId, string slug, address indexed owner);
    event ReleasePublished(
        uint256 indexed releaseId, bytes32 indexed projectId, uint64 seq, string version, bytes32 indexed artifactHash
    );
    event KeyRotated(bytes32 indexed projectId, uint32 newEpoch, bool viaRecovery);
    event ReleaseRevoked(uint256 indexed releaseId, uint8 reason);
    event OwnershipTransferred(bytes32 indexed projectId, address indexed previousOwner, address indexed newOwner);

    /* ---------------------------------------------------------------- errors */

    error InvalidSlug();
    error SlugTaken();
    error BadKeyLength();
    error BadSigLength();
    error UnknownProject();
    error UnknownRelease();
    error InvalidVersion();
    error VersionExists();
    error SignatureInvalid();
    error AlreadyRevoked();
    error InvalidReason();
    error NotOwner();
    error ZeroAddress();
    error OwnerNotPQRegistered();
    error SameKey();

    /* ================================================================ writes */

    /// @notice Register a project. The caller becomes its owner and must hold a registered,
    ///         possession-proven ML-DSA-87 key on QoreChain.
    function registerProject(string calldata slug, bytes calldata signingPubkey, bytes calldata recoveryPubkey)
        external
        returns (bytes32 projectId)
    {
        if (!isValidSlug(slug)) revert InvalidSlug();
        projectId = keccak256(bytes(slug));
        if (_projects[projectId].owner != address(0)) revert SlugTaken();
        if (signingPubkey.length != PUBKEY_BYTES || recoveryPubkey.length != PUBKEY_BYTES) revert BadKeyLength();
        if (keccak256(signingPubkey) == keccak256(recoveryPubkey)) revert SameKey();
        if (!PQC.hasProvenMlDsa87(msg.sender)) revert OwnerNotPQRegistered();

        Project storage p = _projects[projectId];
        p.owner = msg.sender;
        p.signingKeyPtr = SSTORE2.write(signingPubkey);
        p.recoveryKeyPtr = SSTORE2.write(recoveryPubkey);
        p.keyEpoch = 1;
        p.nextSeq = 1;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds outlast the chain by billions of years
        p.createdAt = uint64(block.timestamp);
        p.slug = slug;
        _projectIds.push(projectId);

        // forge-lint: disable-next-line(reentrancy-events) -- only precompile staticcalls and our own SSTORE2 CREATE run before this
        emit ProjectRegistered(projectId, slug, msg.sender);
    }

    /// @notice Publish a release signed by the project's current signing key over PUBLISH_MSG
    ///         with the project's next sequence number.
    function publish(
        bytes32 projectId,
        string calldata version,
        bytes32 artifactHash,
        bytes32 metaHash,
        bytes calldata signature
    ) external returns (uint256 releaseId) {
        // Two steps keep each frame within the 16-slot stack limit of the legacy pipeline.
        _checkPublish(projectId, version, artifactHash, metaHash, signature);
        releaseId = _storeRelease(projectId, version, artifactHash, metaHash, signature);
    }

    /// @notice Replace the signing key. Authorised by the current signing key, or by the
    ///         recovery key when `viaRecovery` is true.
    function rotateKey(bytes32 projectId, bytes calldata newPubkey, bool viaRecovery, bytes calldata signature)
        external
    {
        Project storage p = _project(projectId);
        if (newPubkey.length != PUBKEY_BYTES) revert BadKeyLength();
        if (signature.length != SIGNATURE_BYTES) revert BadSigLength();

        bytes memory current = SSTORE2.read(p.signingKeyPtr);
        bytes memory recovery = SSTORE2.read(p.recoveryKeyPtr);
        bytes32 newHash = keccak256(newPubkey);
        if (newHash == keccak256(current) || newHash == keccak256(recovery)) revert SameKey();

        bytes memory message = _rotateMessage(projectId, p.keyEpoch, newHash, viaRecovery);
        if (!PQC.verify(viaRecovery ? recovery : current, signature, message)) revert SignatureInvalid();

        p.signingKeyPtr = SSTORE2.write(newPubkey);
        p.keyEpoch += 1;

        // forge-lint: disable-next-line(reentrancy-events) -- only precompile staticcalls and our own SSTORE2 CREATE run before this
        emit KeyRotated(projectId, p.keyEpoch, viaRecovery);
    }

    /// @notice Revoke a release. Authorised by the project's current signing key. The record stays
    ///         in the log, marked revoked with a reason.
    function revoke(uint256 releaseId, uint8 reason, bytes calldata signature) external {
        if (releaseId >= _releases.length) revert UnknownRelease();
        if (reason > MAX_REASON) revert InvalidReason();
        Release storage r = _releases[releaseId];
        if (r.revoked) revert AlreadyRevoked();
        if (signature.length != SIGNATURE_BYTES) revert BadSigLength();

        Project storage p = _projects[r.projectId];
        bytes memory message = _revokeMessage(r.projectId, releaseId, reason);
        if (!PQC.verify(SSTORE2.read(p.signingKeyPtr), signature, message)) revert SignatureInvalid();

        r.revoked = true;
        r.revokeReason = reason;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds outlast the chain by billions of years
        r.revokedAt = uint64(block.timestamp);
        revokedCount += 1;

        // forge-lint: disable-next-line(reentrancy-events) -- only precompile staticcalls and our own SSTORE2 CREATE run before this
        emit ReleaseRevoked(releaseId, reason);
    }

    /// @notice Hand project metadata ownership to another account. Grants no signing authority.
    function transferOwnership(bytes32 projectId, address newOwner) external {
        Project storage p = _project(projectId);
        if (msg.sender != p.owner) revert NotOwner();
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(projectId, p.owner, newOwner);
        p.owner = newOwner;
    }

    /* ================================================================ views */

    function getProject(bytes32 projectId) external view returns (ProjectView memory) {
        return _view(projectId, _project(projectId));
    }

    function getProjectBySlug(string calldata slug) external view returns (ProjectView memory) {
        bytes32 projectId = keccak256(bytes(slug));
        return _view(projectId, _project(projectId));
    }

    function getRelease(uint256 releaseId) external view returns (Release memory) {
        if (releaseId >= _releases.length) revert UnknownRelease();
        return _releases[releaseId];
    }

    /// @notice The stored ML-DSA-87 signature of a release.
    function getSignature(uint256 releaseId) external view returns (bytes memory) {
        if (releaseId >= _releases.length) revert UnknownRelease();
        return SSTORE2.read(_releases[releaseId].signaturePtr);
    }

    /// @notice A stored public key, by its SSTORE2 pointer.
    function getPubkey(address pointer) external view returns (bytes memory) {
        return SSTORE2.read(pointer);
    }

    /// @notice Re-run pqcVerify on a stored release, live (the "Re-check signature" button).
    function recheck(uint256 releaseId) external view returns (bool) {
        if (releaseId >= _releases.length) revert UnknownRelease();
        Release storage r = _releases[releaseId];
        bytes memory message = _publishMessage(r.projectId, r.seq, r.versionHash, r.artifactHash, r.metaHash);
        return PQC.verify(SSTORE2.read(r.signingKeyPtr), SSTORE2.read(r.signaturePtr), message);
    }

    function releasesOfArtifact(bytes32 artifactHash, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory)
    {
        return _page(_releasesByArtifact[artifactHash], offset, limit);
    }

    function releasesOfProject(bytes32 projectId, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory)
    {
        return _page(_releasesByProject[projectId], offset, limit);
    }

    function listProjects(uint256 offset, uint256 limit) external view returns (bytes32[] memory ids) {
        uint256 n = _projectIds.length;
        if (offset >= n) return new bytes32[](0);
        uint256 end = limit > n - offset ? n : offset + limit;
        ids = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            ids[i - offset] = _projectIds[i];
        }
    }

    function stats() external view returns (uint256 projectCount, uint256 releaseCount, uint256 revoked) {
        return (_projectIds.length, _releases.length, revokedCount);
    }

    /* ---------- message builders (public so clients and tests can cross-check encodings) ---------- */

    function publishMessage(bytes32 projectId, uint64 seq, string calldata version, bytes32 artifactHash, bytes32 metaHash)
        external
        view
        returns (bytes memory)
    {
        return _publishMessage(projectId, seq, keccak256(bytes(version)), artifactHash, metaHash);
    }

    function rotateMessage(bytes32 projectId, uint32 keyEpoch, bytes calldata newPubkey, bool viaRecovery)
        external
        view
        returns (bytes memory)
    {
        return _rotateMessage(projectId, keyEpoch, keccak256(newPubkey), viaRecovery);
    }

    function revokeMessage(bytes32 projectId, uint256 releaseId, uint8 reason) external view returns (bytes memory) {
        return _revokeMessage(projectId, releaseId, reason);
    }

    /// @notice `^[a-z0-9-]{3,40}$`
    function isValidSlug(string calldata slug) public pure returns (bool) {
        bytes calldata b = bytes(slug);
        if (b.length < 3 || b.length > 40) return false;
        for (uint256 i; i < b.length; ++i) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c == 0x2d;
            if (!ok) return false;
        }
        return true;
    }

    /* ================================================================ internals */

    /// @dev Validates the version string and returns its hash if this project hasn't used it yet.
    function _unusedVersionHash(bytes32 projectId, string calldata version) internal view returns (bytes32 versionHash) {
        uint256 vlen = bytes(version).length;
        if (vlen == 0 || vlen > MAX_VERSION_BYTES) revert InvalidVersion();
        versionHash = keccak256(bytes(version));
        if (releaseIdPlusOne[projectId][versionHash] != 0) revert VersionExists();
    }

    /// @dev Reverts with {SignatureInvalid} unless `signature` by the key at `keyPtr` covers `message`.
    function _requireSigned(address keyPtr, bytes calldata signature, bytes memory message) internal view {
        if (!PQC.verify(SSTORE2.read(keyPtr), signature, message)) revert SignatureInvalid();
    }

    /// @dev Every publish check: project exists, version valid and unused, signature length, and
    ///      pqcVerify over PUBLISH_MSG with the project's next sequence number.
    function _checkPublish(
        bytes32 projectId,
        string calldata version,
        bytes32 artifactHash,
        bytes32 metaHash,
        bytes calldata signature
    ) internal view {
        Project storage p = _project(projectId);
        bytes32 versionHash = _unusedVersionHash(projectId, version);
        if (signature.length != SIGNATURE_BYTES) revert BadSigLength();
        _requireSigned(
            p.signingKeyPtr, signature, _publishMessage(projectId, p.nextSeq, versionHash, artifactHash, metaHash)
        );
    }

    /// @dev Appends the release (field by field; a 13-field struct literal overflows the stack
    ///      without via-IR), indexes it, advances the sequence number and emits the event.
    function _storeRelease(
        bytes32 projectId,
        string calldata version,
        bytes32 artifactHash,
        bytes32 metaHash,
        bytes calldata signature
    ) internal returns (uint256 releaseId) {
        Project storage p = _projects[projectId];
        releaseId = _releases.length;
        Release storage r = _releases.push();
        r.projectId = projectId;
        r.seq = p.nextSeq;
        r.keyEpoch = p.keyEpoch;
        // forge-lint: disable-next-line(unsafe-typecast) -- uint64 seconds outlast the chain by billions of years
        r.publishedAt = uint64(block.timestamp);
        r.versionHash = keccak256(bytes(version));
        r.artifactHash = artifactHash;
        r.metaHash = metaHash;
        r.signaturePtr = SSTORE2.write(signature);
        r.signingKeyPtr = p.signingKeyPtr;
        r.version = version;
        releaseIdPlusOne[projectId][r.versionHash] = releaseId + 1;
        _releasesByArtifact[artifactHash].push(releaseId);
        _releasesByProject[projectId].push(releaseId);
        p.nextSeq += 1;
        // forge-lint: disable-next-line(reentrancy-events) -- only precompile staticcalls and our own SSTORE2 CREATE run before this
        emit ReleasePublished(releaseId, projectId, r.seq, version, artifactHash);
    }

    function _project(bytes32 projectId) internal view returns (Project storage p) {
        p = _projects[projectId];
        if (p.owner == address(0)) revert UnknownProject();
    }

    function _view(bytes32 projectId, Project storage p) internal view returns (ProjectView memory) {
        return ProjectView({
            projectId: projectId,
            owner: p.owner,
            signingKeyPtr: p.signingKeyPtr,
            recoveryKeyPtr: p.recoveryKeyPtr,
            keyEpoch: p.keyEpoch,
            nextSeq: p.nextSeq,
            createdAt: p.createdAt,
            releaseCount: _releasesByProject[projectId].length,
            slug: p.slug
        });
    }

    function _page(uint256[] storage list, uint256 offset, uint256 limit) internal view returns (uint256[] memory out) {
        uint256 n = list.length;
        if (offset >= n) return new uint256[](0);
        uint256 end = limit > n - offset ? n : offset + limit;
        out = new uint256[](end - offset);
        for (uint256 i = offset; i < end; ++i) {
            out[i - offset] = list[i];
        }
    }

    function _publishMessage(bytes32 projectId, uint64 seq, bytes32 versionHash, bytes32 artifactHash, bytes32 metaHash)
        internal
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            PUBLISH_DOMAIN, block.chainid, address(this), projectId, seq, versionHash, artifactHash, metaHash
        );
    }

    function _rotateMessage(bytes32 projectId, uint32 keyEpoch, bytes32 newPubkeyHash, bool viaRecovery)
        internal
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            ROTATE_DOMAIN, block.chainid, address(this), projectId, keyEpoch, newPubkeyHash, viaRecovery
        );
    }

    function _revokeMessage(bytes32 projectId, uint256 releaseId, uint8 reason) internal view returns (bytes memory) {
        return abi.encodePacked(REVOKE_DOMAIN, block.chainid, address(this), projectId, releaseId, reason);
    }
}
