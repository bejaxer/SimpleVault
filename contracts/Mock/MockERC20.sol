// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockERC20 is ERC20 {
    constructor() ERC20('Mock', 'Mock') {}

    function mint(uint256 _amount) external {
        _mint(msg.sender, _amount);
    }
}
