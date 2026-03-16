// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBetFactory
/// @notice Interface for the BetFactory contract
interface IBetFactory {
    struct MatchInfo {
        address matchContract;
        address organizer;
        string teamA;
        string teamB;
        uint256 matchStartTime;
        uint256 betAmount;
        bool isCompleted;
    }

    event MatchCreated(
        uint256 indexed matchId,
        address indexed matchContract,
        address indexed organizer,
        string teamA,
        string teamB,
        uint256 matchStartTime,
        uint256 betAmount
    );

    event OrganizerRated(address indexed organizer, address indexed rater, uint256 indexed matchId, uint8 rating);

    error InvalidTeamName();
    error InvalidStartTime();
    error InvalidBetAmount();
    error MatchNotFound();
    error InvalidRating();
    error MatchNotCompleted();
    error NotABettor();
    error AlreadyRated();
    error Unauthorized();

    function createMatch(string calldata teamA, string calldata teamB, uint256 matchStartTime, uint256 betAmount)
        external
        returns (address matchContract);

    function getActiveMatches() external view returns (MatchInfo[] memory);
    function getCompletedMatches() external view returns (MatchInfo[] memory);
    function getAllMatches() external view returns (MatchInfo[] memory);
    function getMatchCount() external view returns (uint256);
    function getMatch(uint256 matchId) external view returns (MatchInfo memory);
    function rateOrganizer(uint256 matchId, uint8 rating) external;
    function getOrganizerRating(address organizer) external view returns (uint256 average, uint256 count);
    function deployBlock() external view returns (uint256);
}
