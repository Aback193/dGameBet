// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BetMath
/// @notice Math utilities for betting calculations
/// @dev All calculations use integer math with proper precision handling
library BetMath {
    /// @notice Organizer fee percentage (5%)
    uint256 public constant ORGANIZER_FEE_PERCENT = 5;

    /// @notice Winner percentage (95%)
    uint256 public constant WINNER_PERCENT = 95;

    /// @notice Base for percentage calculations
    uint256 public constant PERCENT_BASE = 100;

    /// @notice Calculate organizer fee from total pool
    /// @param totalPool Total betting pool in wei
    /// @return fee Organizer's fee in wei
    function calculateOrganizerFee(uint256 totalPool) internal pure returns (uint256 fee) {
        fee = (totalPool * ORGANIZER_FEE_PERCENT) / PERCENT_BASE;
    }

    /// @notice Calculate prize pool after organizer fee
    /// @param totalPool Total betting pool in wei
    /// @return prizePool Pool available for winners in wei
    function calculatePrizePool(uint256 totalPool) internal pure returns (uint256 prizePool) {
        prizePool = (totalPool * WINNER_PERCENT) / PERCENT_BASE;
    }

    /// @notice Calculate individual prize
    /// @param userBet User's bet amount in wei
    /// @param winningPool Total bets on winning team in wei
    /// @param prizePool Pool available for winners in wei
    /// @return prize User's prize amount in wei
    function calculatePrize(uint256 userBet, uint256 winningPool, uint256 prizePool)
        internal
        pure
        returns (uint256 prize)
    {
        if (winningPool == 0) return 0;
        prize = (userBet * prizePool) / winningPool;
    }
}
