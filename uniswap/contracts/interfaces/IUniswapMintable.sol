// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
interface IUniswapMintable {
    function mint(address token, address to, uint256 amount) external;
    function burn(address token, address from, uint256 amount) external;
}
