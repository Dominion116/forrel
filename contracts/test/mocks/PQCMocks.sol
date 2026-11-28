// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Stand-in for QoreChain's `pqcVerify` precompile, etched at 0x0a01 in unit tests.
/// @dev Forked execution cannot run QoreChain's custom precompiles, so tests use a toy scheme with
///      the same interface and lengths: a "signature" is 4,627 bytes whose first 32 bytes are
///      keccak256(pubkey ‖ message). Wrong key, wrong message or any flipped field fails, exactly
///      like a real ML-DSA-87 check would. Real verification is covered by the live script.
contract MockPQCVerifier {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message)
        external
        pure
        returns (bool)
    {
        if (pubkey.length != 2592 || signature.length != 4627) return false;
        return bytes32(signature[:32]) == keccak256(abi.encodePacked(pubkey, message));
    }
}

/// @notice Stand-in for `pqcKeyStatus`, etched at 0x0a02. Its storage lives at 0x0a02, so tests
///         configure it by calling {set} on that address after etching.
contract MockPQCKeyStatus {
    struct Status {
        bool registered;
        uint8 algorithmId;
        bool possessionProven;
    }

    mapping(address => Status) internal _status;

    function set(address account, bool registered, uint8 algorithmId, bool possessionProven) external {
        _status[account] = Status(registered, algorithmId, possessionProven);
    }

    function pqcKeyStatus(address account) external view returns (bool, uint8, bytes memory, bool) {
        Status memory s = _status[account];
        return (s.registered, s.algorithmId, s.registered ? new bytes(2592) : new bytes(0), s.possessionProven);
    }
}

/// @notice A precompile that is "on" but answers with garbage (a short return), for negative tests.
contract MalformedPrecompile {
    fallback() external {
        assembly {
            mstore(0, 1)
            return(0, 16)
        }
    }
}
