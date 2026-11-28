// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title SSTORE2
/// @notice Store large immutable byte blobs (ML-DSA-87 public keys, signatures) as contract code.
/// @dev Writing 2.6–4.6 KB with SSTORE would cost ~20k gas per 32-byte word; deploying the bytes as
///      code is far cheaper, and reading them back is a single EXTCODECOPY. The data contract's code
///      is `0x00 ‖ data`: the leading STOP byte makes it impossible to call into the blob.
library SSTORE2 {
    error DeploymentFailed();
    error InvalidPointer();

    /// @notice Deploy `data` as code and return the pointer (the data contract's address).
    function write(bytes memory data) internal returns (address pointer) {
        bytes memory runtime = abi.encodePacked(hex"00", data);
        // Creation code (14 bytes) that returns `runtime` as the deployed code:
        //   PUSH4 len | DUP1 | PUSH1 0x0e | PUSH1 0x00 | CODECOPY | PUSH1 0x00 | RETURN
        // forge-lint: disable-next-line(unsafe-typecast) -- EIP-170 caps code at 24 KB, far below uint32
        bytes memory creation = abi.encodePacked(hex"63", uint32(runtime.length), hex"80600e6000396000f3", runtime);
        assembly ("memory-safe") {
            pointer := create(0, add(creation, 0x20), mload(creation))
        }
        if (pointer == address(0)) revert DeploymentFailed();
    }

    /// @notice Read back the bytes stored at `pointer`.
    function read(address pointer) internal view returns (bytes memory data) {
        uint256 size = pointer.code.length;
        if (size == 0) revert InvalidPointer();
        unchecked {
            data = new bytes(size - 1);
        }
        assembly ("memory-safe") {
            extcodecopy(pointer, add(data, 0x20), 1, sub(size, 1))
        }
    }
}
