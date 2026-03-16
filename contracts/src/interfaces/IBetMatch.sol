// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBetMatch
/// @notice Interface for individual betting match contracts
interface IBetMatch {
    enum MatchResult {
        Pending,
        TeamAWins,
        TeamBWins,
        Draw
    }

    enum Team {
        TeamA,
        TeamB
    }

    event BetPlaced(address indexed bettor, Team team, uint256 amount);
    event ResultSet(MatchResult result);
    event PrizeClaimed(address indexed winner, uint256 amount);
    event RefundClaimed(address indexed bettor, uint256 amount);
    event OrganizerPaid(address indexed organizer, uint256 amount);
    event OrganizerPaymentFailed(address indexed organizer, uint256 amount);

    error BettingClosed();
    error MatchNotStarted();
    error OnlyOrganizer();
    error ResultAlreadySet();
    error InvalidResult();
    error InvalidBetAmount();
    error ResultNotSet();
    error MatchWasDraw();
    error MatchNotDraw();
    error AlreadyClaimed();
    error NotAWinner();
    error NoBetsToRefund();
    error TransferFailed();

    function placeBet(Team team) external payable;
    function setResult(MatchResult result) external;
    function claimPrize() external;
    function claimRefund() external;

    function getMatchInfo()
        external
        view
        returns (
            address organizer,
            string memory teamA,
            string memory teamB,
            uint256 matchStartTime,
            uint256 betAmount,
            MatchResult result,
            uint256 totalPoolTeamA,
            uint256 totalPoolTeamB
        );

    function getUserBets(address user) external view returns (uint256 teamABets, uint256 teamBBets);
    function calculatePrize(address user) external view returns (uint256);
}
