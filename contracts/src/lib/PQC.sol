// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title PQC
/// @notice Wrappers for QoreChain's post-quantum precompiles (PRD §12.3).
/// @dev Inactive precompiles answer with empty return data, so every call checks the return
///      length and reverts with {PrecompileUnavailable} instead of ever reading "empty" as "true".
library PQC {
    /// @dev `pqcVerify(bytes pubkey, bytes signature, bytes message) returns (bool)`.
    address internal constant PQC_VERIFY = address(uint160(0x0a01));
    /// @dev `pqcKeyStatus(address) returns (bool registered, uint8 algorithmId, bytes pubkey, bool possessionProven)`.
    address internal constant PQC_KEY_STATUS = address(uint160(0x0a02));

    /// @dev Algorithm identifier QoreChain uses for ML-DSA-87.
    uint8 internal constant ALG_ML_DSA_87 = 1;

    error PrecompileUnavailable();

    /// @notice Verify an ML-DSA-87 signature over `message` (FIPS 204 pure, empty context).
    function verify(bytes memory pubkey, bytes memory signature, bytes memory message) internal view returns (bool) {
        (bool ok, bytes memory ret) =
            PQC_VERIFY.staticcall(abi.encodeWithSignature("pqcVerify(bytes,bytes,bytes)", pubkey, signature, message));
        if (!ok || ret.length != 32) revert PrecompileUnavailable();
        return abi.decode(ret, (bool));
    }

    /// @notice Key status of a QoreChain account.
    function keyStatus(address account)
        internal
        view
        returns (bool registered, uint8 algorithmId, bool possessionProven)
    {
        (bool ok, bytes memory ret) =
            PQC_KEY_STATUS.staticcall(abi.encodeWithSignature("pqcKeyStatus(address)", account));
        // (bool, uint8, bytes, bool) needs at least 4 head words + the bytes length word.
        if (!ok || ret.length < 160) revert PrecompileUnavailable();
        (registered, algorithmId,, possessionProven) = abi.decode(ret, (bool, uint8, bytes, bool));
    }

    /// @notice True when `account` has a registered, possession-proven ML-DSA-87 key.
    function hasProvenMlDsa87(address account) internal view returns (bool) {
        (bool registered, uint8 algorithmId, bool proven) = keyStatus(account);
        return registered && algorithmId == ALG_ML_DSA_87 && proven;
    }
}
