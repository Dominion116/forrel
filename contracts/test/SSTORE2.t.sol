// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";

import {SSTORE2} from "../src/lib/SSTORE2.sol";

/// @dev Exposes the library so reverts surface as external calls.
contract SSTORE2Harness {
    function write(bytes calldata data) external returns (address) {
        return SSTORE2.write(data);
    }

    function read(address pointer) external view returns (bytes memory) {
        return SSTORE2.read(pointer);
    }
}

contract SSTORE2Test is Test {
    SSTORE2Harness internal h;

    function setUp() public {
        h = new SSTORE2Harness();
    }

    function test_roundTripsKeyAndSignatureSizes() public {
        bytes memory key = new bytes(2592);
        bytes memory sig = new bytes(4627);
        key[0] = 0x11;
        key[2591] = 0x22;
        sig[4626] = 0x33;
        assertEq(h.read(h.write(key)), key);
        assertEq(h.read(h.write(sig)), sig);
    }

    function test_roundTripsEmpty() public {
        assertEq(h.read(h.write("")).length, 0);
    }

    function test_blobStartsWithStopSoItCannotBeExecuted() public {
        address ptr = h.write(hex"6001600155"); // would be PUSH1 1 PUSH1 1 SSTORE if executed
        assertEq(uint8(ptr.code[0]), 0x00);
        (bool ok, bytes memory ret) = ptr.call("");
        assertTrue(ok);
        assertEq(ret.length, 0);
        assertEq(vm.load(ptr, bytes32(uint256(1))), bytes32(0));
    }

    function test_readRevertsOnEmptyPointer() public {
        vm.expectRevert(SSTORE2.InvalidPointer.selector);
        h.read(address(0xdead));
    }

    function testFuzz_roundTrip(bytes calldata data) public {
        vm.assume(data.length < 8000);
        assertEq(h.read(h.write(data)), data);
    }
}
