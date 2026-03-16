// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBetMatch} from "./interfaces/IBetMatch.sol";
import {BetFactory} from "./BetFactory.sol";
import {BetMath} from "./libraries/BetMath.sol";

/// @title BetMatch
/// @notice Individual betting match contract
/// @dev Uses pull payment pattern for prize distribution
contract BetMatch is IBetMatch, ReentrancyGuard {
    // ============================================================
    // State Variables
    // ============================================================

    /// @notice Factory contract address
    address public immutable factory;

    /// @notice Match organizer address
    address public immutable organizer;

    /// @notice Match ID in factory
    uint256 public immutable matchId;

    /// @notice Name of Team A
    string public teamAName;

    /// @notice Name of Team B
    string public teamBName;

    /// @notice Unix timestamp when match starts
    uint256 public immutable matchStartTime;

    /// @notice Fixed bet amount in wei
    uint256 public immutable betAmount;

    /// @notice Match result
    MatchResult public result;

    /// @notice Total bets on Team A
    uint256 public totalPoolTeamA;

    /// @notice Total bets on Team B
    uint256 public totalPoolTeamB;

    /// @notice Bets placed on Team A per address
    mapping(address => uint256) public betsTeamA;

    /// @notice Bets placed on Team B per address
    mapping(address => uint256) public betsTeamB;

    /// @notice Tracks if user has claimed prize/refund
    mapping(address => bool) public hasClaimed;

    /// @notice Tracks if organizer has been paid
    bool public organizerPaid;

    // ============================================================
    // Constructor
    // ============================================================

    /// @notice Create a new betting match
    /// @param _factory Factory contract address
    /// @param _organizer Match organizer
    /// @param _teamA Team A name
    /// @param _teamB Team B name
    /// @param _matchStartTime Match start timestamp
    /// @param _betAmount Fixed bet amount
    /// @param _matchId Match ID in factory
    constructor(
        address _factory,
        address _organizer,
        string memory _teamA,
        string memory _teamB,
        uint256 _matchStartTime,
        uint256 _betAmount,
        uint256 _matchId
    ) {
        factory = _factory;
        organizer = _organizer;
        teamAName = _teamA;
        teamBName = _teamB;
        matchStartTime = _matchStartTime;
        betAmount = _betAmount;
        matchId = _matchId;
        result = MatchResult.Pending;
    }

    // ============================================================
    // Modifiers
    // ============================================================

    /// @notice Restricts to before match start
    modifier onlyBeforeMatch() {
        if (block.timestamp >= matchStartTime) revert BettingClosed();
        _;
    }

    /// @notice Restricts to after match start
    modifier onlyAfterMatch() {
        if (block.timestamp < matchStartTime) revert MatchNotStarted();
        _;
    }

    /// @notice Restricts to organizer only
    modifier onlyOrganizer() {
        if (msg.sender != organizer) revert OnlyOrganizer();
        _;
    }

    /// @notice Restricts to pending result
    modifier onlyPending() {
        if (result != MatchResult.Pending) revert ResultAlreadySet();
        _;
    }

    // ============================================================
    // External Functions
    // ============================================================

    /// @notice Place a bet on a team
    /// @param team Team to bet on (TeamA or TeamB)
    function placeBet(Team team) external payable onlyBeforeMatch {
        if (msg.value != betAmount) revert InvalidBetAmount();

        if (team == Team.TeamA) {
            betsTeamA[msg.sender] += msg.value;
            totalPoolTeamA += msg.value;
        } else {
            betsTeamB[msg.sender] += msg.value;
            totalPoolTeamB += msg.value;
        }

        BetFactory(factory).recordBet(matchId, msg.sender);

        emit BetPlaced(msg.sender, team, msg.value);
    }

    /// @notice Set the match result
    /// @param _result Match result
    function setResult(MatchResult _result) external nonReentrant onlyOrganizer onlyAfterMatch onlyPending {
        if (_result == MatchResult.Pending) revert InvalidResult();

        result = _result;

        if (_result != MatchResult.Draw) {
            _payOrganizer();
        }

        BetFactory(factory).markMatchCompleted(matchId);

        emit ResultSet(_result);
    }

    /// @notice Claim prize for winners
    function claimPrize() external nonReentrant {
        if (result == MatchResult.Pending) revert ResultNotSet();
        if (result == MatchResult.Draw) revert MatchWasDraw();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        uint256 userBet;
        uint256 winningPool;

        if (result == MatchResult.TeamAWins) {
            userBet = betsTeamA[msg.sender];
            winningPool = totalPoolTeamA;
        } else {
            userBet = betsTeamB[msg.sender];
            winningPool = totalPoolTeamB;
        }

        if (userBet == 0) revert NotAWinner();

        uint256 totalPool = totalPoolTeamA + totalPoolTeamB;
        uint256 prizePool = BetMath.calculatePrizePool(totalPool);
        uint256 prize = BetMath.calculatePrize(userBet, winningPool, prizePool);

        hasClaimed[msg.sender] = true;

        (bool success,) = payable(msg.sender).call{value: prize}("");
        if (!success) revert TransferFailed();

        emit PrizeClaimed(msg.sender, prize);
    }

    /// @notice Claim refund for draws
    function claimRefund() external nonReentrant {
        if (result != MatchResult.Draw) revert MatchNotDraw();
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();

        uint256 totalUserBet = betsTeamA[msg.sender] + betsTeamB[msg.sender];
        if (totalUserBet == 0) revert NoBetsToRefund();

        hasClaimed[msg.sender] = true;

        (bool success,) = payable(msg.sender).call{value: totalUserBet}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(msg.sender, totalUserBet);
    }

    /// @notice Get match information
    function getMatchInfo()
        external
        view
        returns (
            address _organizer,
            string memory _teamA,
            string memory _teamB,
            uint256 _matchStartTime,
            uint256 _betAmount,
            MatchResult _result,
            uint256 _totalPoolTeamA,
            uint256 _totalPoolTeamB
        )
    {
        return (organizer, teamAName, teamBName, matchStartTime, betAmount, result, totalPoolTeamA, totalPoolTeamB);
    }

    /// @notice Get user's bets
    /// @param user User address
    /// @return teamABets Amount bet on Team A
    /// @return teamBBets Amount bet on Team B
    function getUserBets(address user) external view returns (uint256 teamABets, uint256 teamBBets) {
        return (betsTeamA[user], betsTeamB[user]);
    }

    /// @notice Calculate potential prize for a user
    /// @param user User address
    /// @return prize Potential prize amount
    function calculatePrize(address user) external view returns (uint256 prize) {
        if (result == MatchResult.Pending || result == MatchResult.Draw) {
            return 0;
        }

        uint256 userBet;
        uint256 winningPool;

        if (result == MatchResult.TeamAWins) {
            userBet = betsTeamA[user];
            winningPool = totalPoolTeamA;
        } else {
            userBet = betsTeamB[user];
            winningPool = totalPoolTeamB;
        }

        if (userBet == 0 || winningPool == 0) {
            return 0;
        }

        uint256 totalPool = totalPoolTeamA + totalPoolTeamB;
        uint256 prizePool = BetMath.calculatePrizePool(totalPool);
        prize = BetMath.calculatePrize(userBet, winningPool, prizePool);
    }

    // ============================================================
    // Internal Functions
    // ============================================================

    /// @notice Pay organizer fee (5% to organizer)
    function _payOrganizer() internal {
        if (organizerPaid) return;

        uint256 totalPool = totalPoolTeamA + totalPoolTeamB;
        uint256 fee = BetMath.calculateOrganizerFee(totalPool);

        if (fee == 0) return;

        organizerPaid = true;

        (bool success,) = payable(organizer).call{value: fee}("");
        if (!success) {
            emit OrganizerPaymentFailed(organizer, fee);
        } else {
            emit OrganizerPaid(organizer, fee);
        }
    }
}
