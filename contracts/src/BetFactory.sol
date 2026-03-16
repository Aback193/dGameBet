// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BetMatch} from "./BetMatch.sol";
import {IBetFactory} from "./interfaces/IBetFactory.sol";
import {IBetMatch} from "./interfaces/IBetMatch.sol";

/// @title BetFactory
/// @notice Factory contract for creating betting matches
/// @dev Implements factory pattern for match deployment and organizer rating system
contract BetFactory is IBetFactory {
    // ============================================================
    // State Variables
    // ============================================================

    /// @notice Array of all created matches
    MatchInfo[] private _matches;

    /// @notice Mapping of organizer address to their match indices
    mapping(address => uint256[]) public organizerMatches;

    /// @notice Rating information per organizer
    struct RatingInfo {
        uint256 totalRating;
        uint256 ratingCount;
    }

    mapping(address => RatingInfo) public organizerRatings;

    /// @notice Tracks if a user has rated an organizer for a specific match
    mapping(address => mapping(uint256 => bool)) public hasRated;

    /// @notice Tracks if a user has bet on a specific match (for rating eligibility)
    mapping(address => mapping(uint256 => bool)) public hasBet;

    /// @notice Block number when this factory was deployed
    uint256 public immutable deployBlock;

    // ============================================================
    // Constructor
    // ============================================================

    constructor() {
        deployBlock = block.number;
    }

    // ============================================================
    // External Functions
    // ============================================================

    /// @notice Create a new betting match
    /// @param teamA Name of Team A
    /// @param teamB Name of Team B
    /// @param matchStartTime Unix timestamp when match starts
    /// @param _betAmount Fixed bet amount in wei
    /// @return matchContract Address of the deployed match contract
    function createMatch(string calldata teamA, string calldata teamB, uint256 matchStartTime, uint256 _betAmount)
        external
        returns (address matchContract)
    {
        if (bytes(teamA).length == 0 || bytes(teamB).length == 0) {
            revert InvalidTeamName();
        }
        if (matchStartTime <= block.timestamp) {
            revert InvalidStartTime();
        }
        if (_betAmount == 0) {
            revert InvalidBetAmount();
        }

        uint256 matchId = _matches.length;
        BetMatch newMatch = new BetMatch(address(this), msg.sender, teamA, teamB, matchStartTime, _betAmount, matchId);

        matchContract = address(newMatch);

        _matches.push(
            MatchInfo({
                matchContract: matchContract,
                organizer: msg.sender,
                teamA: teamA,
                teamB: teamB,
                matchStartTime: matchStartTime,
                betAmount: _betAmount,
                isCompleted: false
            })
        );

        organizerMatches[msg.sender].push(matchId);

        emit MatchCreated(matchId, matchContract, msg.sender, teamA, teamB, matchStartTime, _betAmount);
    }

    /// @notice Get all active (non-completed) matches
    /// @dev Returns matches that are not yet completed, regardless of whether
    ///      their start time has passed. Matches whose start time has elapsed
    ///      but have no result set are still "active" (awaiting result).
    /// @return activeMatches Array of active match info
    function getActiveMatches() external view returns (MatchInfo[] memory activeMatches) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _matches.length; i++) {
            if (!_matches[i].isCompleted) {
                activeCount++;
            }
        }

        activeMatches = new MatchInfo[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _matches.length; i++) {
            if (!_matches[i].isCompleted) {
                activeMatches[index] = _matches[i];
                index++;
            }
        }
    }

    /// @notice Get all completed matches
    /// @return completedMatches Array of completed match info
    function getCompletedMatches() external view returns (MatchInfo[] memory completedMatches) {
        uint256 completedCount = 0;
        for (uint256 i = 0; i < _matches.length; i++) {
            if (_matches[i].isCompleted) {
                completedCount++;
            }
        }

        completedMatches = new MatchInfo[](completedCount);
        uint256 index = 0;
        for (uint256 i = 0; i < _matches.length; i++) {
            if (_matches[i].isCompleted) {
                completedMatches[index] = _matches[i];
                index++;
            }
        }
    }

    /// @notice Get all matches regardless of status
    /// @return allMatches Array of all match info
    function getAllMatches() external view returns (MatchInfo[] memory allMatches) {
        uint256 len = _matches.length;
        allMatches = new MatchInfo[](len);
        for (uint256 i = 0; i < len; i++) {
            allMatches[i] = _matches[i];
        }
    }

    /// @notice Get total number of matches
    /// @return count Total match count
    function getMatchCount() external view returns (uint256 count) {
        count = _matches.length;
    }

    /// @notice Get match info by ID
    /// @param matchId The match index
    /// @return info Match information
    function getMatch(uint256 matchId) external view returns (MatchInfo memory info) {
        if (matchId >= _matches.length) revert MatchNotFound();
        info = _matches[matchId];
    }

    /// @notice Rate an organizer after match completion
    /// @param matchId The match ID
    /// @param rating Rating from 1 to 5
    function rateOrganizer(uint256 matchId, uint8 rating) external {
        if (matchId >= _matches.length) revert MatchNotFound();
        if (rating < 1 || rating > 5) revert InvalidRating();

        MatchInfo storage matchInfo = _matches[matchId];

        if (!matchInfo.isCompleted) revert MatchNotCompleted();
        if (!hasBet[msg.sender][matchId]) revert NotABettor();
        if (hasRated[msg.sender][matchId]) revert AlreadyRated();

        hasRated[msg.sender][matchId] = true;
        organizerRatings[matchInfo.organizer].totalRating += rating;
        organizerRatings[matchInfo.organizer].ratingCount++;

        emit OrganizerRated(matchInfo.organizer, msg.sender, matchId, rating);
    }

    /// @notice Get organizer's average rating
    /// @param organizer Organizer address
    /// @return average Average rating (multiplied by 100 for precision)
    /// @return count Total number of ratings
    function getOrganizerRating(address organizer) external view returns (uint256 average, uint256 count) {
        RatingInfo storage info = organizerRatings[organizer];
        count = info.ratingCount;
        if (count > 0) {
            average = (info.totalRating * 100) / count;
        }
    }

    // ============================================================
    // Functions called by BetMatch contracts
    // ============================================================

    /// @notice Mark a match as completed (called by BetMatch on setResult)
    /// @param matchId The match ID
    function markMatchCompleted(uint256 matchId) external {
        if (matchId >= _matches.length) revert MatchNotFound();
        if (msg.sender != _matches[matchId].matchContract) revert Unauthorized();

        _matches[matchId].isCompleted = true;
    }

    /// @notice Record that a user has bet on a match (for rating eligibility)
    /// @param matchId The match ID
    /// @param bettor The bettor's address
    function recordBet(uint256 matchId, address bettor) external {
        if (matchId >= _matches.length) revert MatchNotFound();
        if (msg.sender != _matches[matchId].matchContract) revert Unauthorized();

        hasBet[bettor][matchId] = true;
    }
}
