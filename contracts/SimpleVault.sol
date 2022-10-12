// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract SimpleVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ////////////////////////////////////////////////////////////////////////////
    // DATA
    ////////////////////////////////////////////////////////////////////////////

    struct UserInfo {
        address wallet;
        uint256 amount;
    }

    ////////////////////////////////////////////////////////////////////////////
    // STATE
    ////////////////////////////////////////////////////////////////////////////

    /// @notice ERC20 token address
    IERC20 public asset;
    /// @notice UserInfo array
    UserInfo[] public deposits;
    /// @notice address => UserInfo index
    mapping(address => uint256) public depositIndexOf;

    ////////////////////////////////////////////////////////////////////////////
    // EVENTS
    ////////////////////////////////////////////////////////////////////////////

    event Deposited(address indexed who, uint256 indexed amount);
    event Withdrawn(address indexed who, uint256 indexed amount);

    ////////////////////////////////////////////////////////////////////////////
    // CONSTRUCTOR
    ////////////////////////////////////////////////////////////////////////////

    constructor(address _asset) {
        require(_asset != address(0), 'SimpleVault: invalid asset');

        asset = IERC20(_asset);

        deposits.push(UserInfo({wallet: address(0), amount: 0}));
    }

    ////////////////////////////////////////////////////////////////////////////
    /// ADMIN
    ////////////////////////////////////////////////////////////////////////////

    function pause() external onlyOwner whenNotPaused {
        return _pause();
    }

    function unpause() external onlyOwner whenPaused {
        return _unpause();
    }

    ////////////////////////////////////////////////////////////////////////////
    // PUBLIC
    ////////////////////////////////////////////////////////////////////////////

    /**
     * @notice deposit funds into the vault
     * @param _amount amount of the asset
     */
    function deposit(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, 'SimpleVault: zero amount');

        /// asset transfer
        IERC20(asset).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 index = depositIndexOf[msg.sender];
        /// first deposit with new index
        if (index == 0) {
            depositIndexOf[msg.sender] = deposits.length;
            deposits.push(UserInfo({wallet: msg.sender, amount: _amount}));
        }
        /// next deposit with an existing index
        else {
            UserInfo storage userInfo = deposits[index];
            userInfo.amount += _amount;
        }

        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice withdraw funds from the vault
     * @param _amount amount of the asset
     */
    function withdraw(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, 'SimpleVault: zero amount');

        // any deposit before
        uint256 index = depositIndexOf[msg.sender];
        if (index == 0) {
            revert('SimpleVault: no deposit');
        }

        UserInfo storage userInfo = deposits[index];

        /// enough fund to withdraw
        require(userInfo.amount >= _amount, 'SimpleVault: invalid amount');

        userInfo.amount -= _amount;
        /// delete if no remaining fund
        if (userInfo.amount == 0) {
            depositIndexOf[msg.sender] = 0;
            uint256 lastIndex = deposits.length - 1;
            deposits[index] = deposits[lastIndex];
            delete deposits[lastIndex];
            deposits.pop();
            depositIndexOf[deposits[index].wallet] = index;
        }

        /// asset transfer
        IERC20(asset).safeTransfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount);
    }

    ////////////////////////////////////////////////////////////////////////////
    // VIEW
    ////////////////////////////////////////////////////////////////////////////

    /**
     * @notice return deposit amount
     * @param _wallet funder's wallet address
     */
    function depositAmountOf(address _wallet)
        external
        view
        returns (uint256 amount_)
    {
        uint256 index = depositIndexOf[_wallet];
        if (index > 0) {
            amount_ = deposits[index].amount;
        }
    }

    /**
     * @notice return 2 users with most of funds
     */
    function topFunders()
        external
        view
        returns (UserInfo[] memory topFunders_)
    {
        topFunders_ = new UserInfo[](2);

        uint256 length = deposits.length;
        for (uint256 i = 0; i < length; i++) {
            UserInfo memory userInfo = deposits[i];
            if (topFunders_[0].amount < userInfo.amount) {
                topFunders_[1] = topFunders_[0];
                topFunders_[0] = userInfo;
            } else if (topFunders_[1].amount < userInfo.amount) {
                topFunders_[1] = userInfo;
            }
        }
    }
}
