// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BetFactory} from "../src/BetFactory.sol";
import {BetMatch} from "../src/BetMatch.sol";
import {IBetMatch} from "../src/interfaces/IBetMatch.sol";
import {IBetFactory} from "../src/interfaces/IBetFactory.sol";
import {BetMath} from "../src/libraries/BetMath.sol";

/// @dev Contract that rejects ETH transfers (for testing organizer payment failure)
contract RejectETH {
    BetFactory public immutable factory;

    constructor(BetFactory _factory) {
        factory = _factory;
    }

    function createMatch(string calldata a, string calldata b, uint256 t, uint256 amt) external returns (address) {
        return factory.createMatch(a, b, t, amt);
    }

    function setResult(BetMatch m, IBetMatch.MatchResult r) external {
        m.setResult(r);
    }
}

/// @dev Contract that can place bets but rejects ETH on receive (for testing TransferFailed)
contract RejectingBettor {
    function placeBet(BetMatch m, IBetMatch.Team team) external payable {
        m.placeBet{value: msg.value}(team);
    }

    function claimPrize(BetMatch m) external {
        m.claimPrize();
    }

    function claimRefund(BetMatch m) external {
        m.claimRefund();
    }
}

/// @dev Contract that attempts reentrancy when receiving ETH
contract ReentrancyAttacker {
    BetFactory public immutable factory;
    BetMatch public target;
    bool public attacking;

    constructor(BetFactory _factory) {
        factory = _factory;
    }

    function createMatch(string calldata a, string calldata b, uint256 t, uint256 amt) external returns (address) {
        return factory.createMatch(a, b, t, amt);
    }

    function setTarget(BetMatch _target) external {
        target = _target;
    }

    function setResult(BetMatch m, IBetMatch.MatchResult r) external {
        m.setResult(r);
    }

    function attack() external {
        attacking = true;
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            target.claimPrize();
        }
    }
}

contract BetMatchTest is Test {
    BetFactory public factory;
    BetMatch public betMatch;

    address public organizer = makeAddr("organizer");
    address public bettor1 = makeAddr("bettor1");
    address public bettor2 = makeAddr("bettor2");
    address public bettor3 = makeAddr("bettor3");

    uint256 public constant BET_AMOUNT = 0.1 ether;
    uint256 public matchStartTime;

    function setUp() public {
        factory = new BetFactory();
        matchStartTime = block.timestamp + 1 days;

        vm.deal(organizer, 10 ether);
        vm.deal(bettor1, 10 ether);
        vm.deal(bettor2, 10 ether);
        vm.deal(bettor3, 10 ether);

        vm.prank(organizer);
        address matchAddr = factory.createMatch("Barcelona", "Real Madrid", matchStartTime, BET_AMOUNT);
        betMatch = BetMatch(matchAddr);
    }

    // ============================================================
    // Constructor / State Tests
    // ============================================================

    function test_Constructor_SetsValues() public view {
        assertEq(betMatch.factory(), address(factory));
        assertEq(betMatch.organizer(), organizer);
        assertEq(betMatch.teamAName(), "Barcelona");
        assertEq(betMatch.teamBName(), "Real Madrid");
        assertEq(betMatch.matchStartTime(), matchStartTime);
        assertEq(betMatch.betAmount(), BET_AMOUNT);
        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.Pending));
        assertEq(betMatch.matchId(), 0);
    }

    // ============================================================
    // placeBet Tests
    // ============================================================

    function test_PlaceBet_TeamA_Success() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        (uint256 teamABets, uint256 teamBBets) = betMatch.getUserBets(bettor1);
        assertEq(teamABets, BET_AMOUNT);
        assertEq(teamBBets, 0);
        assertEq(betMatch.totalPoolTeamA(), BET_AMOUNT);
    }

    function test_PlaceBet_TeamB_Success() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        (uint256 teamABets, uint256 teamBBets) = betMatch.getUserBets(bettor1);
        assertEq(teamABets, 0);
        assertEq(teamBBets, BET_AMOUNT);
        assertEq(betMatch.totalPoolTeamB(), BET_AMOUNT);
    }

    function test_PlaceBet_EmitsEvent() public {
        vm.prank(bettor1);
        vm.expectEmit(true, false, false, true);
        emit IBetMatch.BetPlaced(bettor1, IBetMatch.Team.TeamA, BET_AMOUNT);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
    }

    function test_PlaceBet_WrongAmount() public {
        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.InvalidBetAmount.selector);
        betMatch.placeBet{value: 0.05 ether}(IBetMatch.Team.TeamA);
    }

    function test_PlaceBet_AfterStart() public {
        vm.warp(matchStartTime);
        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.BettingClosed.selector);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
    }

    function test_PlaceBet_MultipleBets() public {
        vm.startPrank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.stopPrank();

        (uint256 teamABets,) = betMatch.getUserBets(bettor1);
        assertEq(teamABets, BET_AMOUNT * 2);
        assertEq(betMatch.totalPoolTeamA(), BET_AMOUNT * 2);
    }

    function test_PlaceBet_MultipleUsers() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        assertEq(betMatch.totalPoolTeamA(), BET_AMOUNT);
        assertEq(betMatch.totalPoolTeamB(), BET_AMOUNT);
    }

    // ============================================================
    // setResult Tests
    // ============================================================

    function test_SetResult_TeamAWins() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.TeamAWins));
    }

    function test_SetResult_TeamBWins() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.TeamBWins));
    }

    function test_SetResult_Draw() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.Draw));
    }

    function test_SetResult_EmitsEvent() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        vm.expectEmit(false, false, false, true);
        emit IBetMatch.ResultSet(IBetMatch.MatchResult.TeamAWins);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);
    }

    function test_SetResult_NotOrganizer() public {
        _placeBetsAndWarp();

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.OnlyOrganizer.selector);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);
    }

    function test_SetResult_BeforeStart() public {
        vm.prank(organizer);
        vm.expectRevert(IBetMatch.MatchNotStarted.selector);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);
    }

    function test_SetResult_AlreadySet() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(organizer);
        vm.expectRevert(IBetMatch.ResultAlreadySet.selector);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);
    }

    function test_SetResult_PendingInvalid() public {
        _placeBetsAndWarp();

        vm.prank(organizer);
        vm.expectRevert(IBetMatch.InvalidResult.selector);
        betMatch.setResult(IBetMatch.MatchResult.Pending);
    }

    function test_SetResult_PaysOrganizer() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 expectedFee = (totalPool * 5) / 100;
        uint256 orgBalBefore = organizer.balance;

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        assertEq(organizer.balance - orgBalBefore, expectedFee);
        assertTrue(betMatch.organizerPaid());
    }

    function test_SetResult_DrawNoOrganizerFee() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        uint256 orgBalBefore = organizer.balance;

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        assertEq(organizer.balance, orgBalBefore);
        assertFalse(betMatch.organizerPaid());
    }

    // ============================================================
    // claimPrize Tests
    // ============================================================

    function test_ClaimPrize_Winner() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 prizePool = (totalPool * 95) / 100;
        uint256 expectedPrize = (BET_AMOUNT * prizePool) / BET_AMOUNT;

        uint256 balBefore = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimPrize();

        assertEq(bettor1.balance - balBefore, expectedPrize);
        assertTrue(betMatch.hasClaimed(bettor1));
    }

    function test_ClaimPrize_EmitsEvent() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 prizePool = (totalPool * 95) / 100;

        vm.prank(bettor1);
        vm.expectEmit(true, false, false, true);
        emit IBetMatch.PrizeClaimed(bettor1, prizePool);
        betMatch.claimPrize();
    }

    function test_ClaimPrize_NotWinner() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor2);
        vm.expectRevert(IBetMatch.NotAWinner.selector);
        betMatch.claimPrize();
    }

    function test_ClaimPrize_AlreadyClaimed() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        betMatch.claimPrize();

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.AlreadyClaimed.selector);
        betMatch.claimPrize();
    }

    function test_ClaimPrize_NoResult() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.ResultNotSet.selector);
        betMatch.claimPrize();
    }

    function test_ClaimPrize_DrawReverts() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.MatchWasDraw.selector);
        betMatch.claimPrize();
    }

    function test_ClaimPrize_NoBet() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor3);
        vm.expectRevert(IBetMatch.NotAWinner.selector);
        betMatch.claimPrize();
    }

    // ============================================================
    // claimRefund Tests
    // ============================================================

    function test_ClaimRefund_Draw() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        uint256 balBefore = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimRefund();

        assertEq(bettor1.balance - balBefore, BET_AMOUNT);
    }

    function test_ClaimRefund_EmitsEvent() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        vm.prank(bettor1);
        vm.expectEmit(true, false, false, true);
        emit IBetMatch.RefundClaimed(bettor1, BET_AMOUNT);
        betMatch.claimRefund();
    }

    function test_ClaimRefund_NotDraw() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.MatchNotDraw.selector);
        betMatch.claimRefund();
    }

    function test_ClaimRefund_AlreadyClaimed() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        vm.prank(bettor1);
        betMatch.claimRefund();

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.AlreadyClaimed.selector);
        betMatch.claimRefund();
    }

    function test_ClaimRefund_NoBets() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        vm.prank(bettor3);
        vm.expectRevert(IBetMatch.NoBetsToRefund.selector);
        betMatch.claimRefund();
    }

    function test_ClaimRefund_BothTeams() public {
        vm.startPrank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);
        vm.stopPrank();

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        uint256 balBefore = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimRefund();

        assertEq(bettor1.balance - balBefore, BET_AMOUNT * 2);
    }

    // ============================================================
    // View Function Tests
    // ============================================================

    function test_GetMatchInfo() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        (
            address _organizer,
            string memory _teamA,
            string memory _teamB,
            uint256 _matchStartTime,
            uint256 _betAmount,
            IBetMatch.MatchResult _result,
            uint256 _totalPoolTeamA,
            uint256 _totalPoolTeamB
        ) = betMatch.getMatchInfo();

        assertEq(_organizer, organizer);
        assertEq(_teamA, "Barcelona");
        assertEq(_teamB, "Real Madrid");
        assertEq(_matchStartTime, matchStartTime);
        assertEq(_betAmount, BET_AMOUNT);
        assertEq(uint256(_result), uint256(IBetMatch.MatchResult.Pending));
        assertEq(_totalPoolTeamA, BET_AMOUNT);
        assertEq(_totalPoolTeamB, 0);
    }

    function test_CalculatePrize_Pending() public view {
        uint256 prize = betMatch.calculatePrize(bettor1);
        assertEq(prize, 0);
    }

    function test_CalculatePrize_Draw() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        uint256 prize = betMatch.calculatePrize(bettor1);
        assertEq(prize, 0);
    }

    function test_CalculatePrize_Correct() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 prizePool = (totalPool * 95) / 100;
        uint256 expectedPrize = (BET_AMOUNT * prizePool) / BET_AMOUNT;

        uint256 prize = betMatch.calculatePrize(bettor1);
        assertEq(prize, expectedPrize);
    }

    function test_CalculatePrize_NoBet() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 prize = betMatch.calculatePrize(bettor3);
        assertEq(prize, 0);
    }

    function test_OrganizerFee_Correct() public {
        vm.prank(organizer);
        address feeMatchAddr = factory.createMatch("Fee A", "Fee B", matchStartTime, 1 ether);
        BetMatch feeMatch = BetMatch(feeMatchAddr);

        vm.prank(bettor1);
        feeMatch.placeBet{value: 1 ether}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        feeMatch.placeBet{value: 1 ether}(IBetMatch.Team.TeamB);

        uint256 orgBalBefore = organizer.balance;

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        feeMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 fee = organizer.balance - orgBalBefore;
        uint256 expectedFee = (2 ether * 5) / 100;
        assertEq(fee, expectedFee);
    }

    // ============================================================
    // Additional Coverage Tests
    // ============================================================

    function test_CalculatePrize_TeamBWins() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 prizePool = (totalPool * 95) / 100;

        uint256 prize = betMatch.calculatePrize(bettor2);
        assertEq(prize, prizePool);

        uint256 prizeLoser = betMatch.calculatePrize(bettor1);
        assertEq(prizeLoser, 0);
    }

    function test_GetMatchInfo_AfterResult() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        (,,,,, IBetMatch.MatchResult _result, uint256 _poolA, uint256 _poolB) = betMatch.getMatchInfo();
        assertEq(uint256(_result), uint256(IBetMatch.MatchResult.TeamBWins));
        assertEq(_poolA, BET_AMOUNT);
        assertEq(_poolB, BET_AMOUNT);
    }

    function test_ClaimPrize_AsymmetricPools() public {
        vm.prank(organizer);
        address asymAddr = factory.createMatch("Asym A", "Asym B", matchStartTime, BET_AMOUNT);
        BetMatch asymMatch = BetMatch(asymAddr);

        vm.prank(bettor1);
        asymMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        asymMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor3);
        asymMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        address bettor4 = makeAddr("bettor4");
        vm.deal(bettor4, 10 ether);
        vm.prank(bettor4);
        asymMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        asymMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        uint256 totalPool = BET_AMOUNT * 4;
        uint256 prizePool = (totalPool * 95) / 100;

        uint256 prize = asymMatch.calculatePrize(bettor4);
        assertEq(prize, prizePool);

        uint256 bal4Before = bettor4.balance;
        vm.prank(bettor4);
        asymMatch.claimPrize();
        assertEq(bettor4.balance - bal4Before, prizePool);
    }

    // ============================================================
    // Edge Case: Organizer Payment Failure
    // ============================================================

    function test_SetResult_OrganizerPaymentFails() public {
        RejectETH rejectOrg = new RejectETH(factory);
        vm.prank(address(rejectOrg));
        address matchAddr = rejectOrg.createMatch("Fail A", "Fail B", matchStartTime, BET_AMOUNT);
        BetMatch failMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        failMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        failMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 fee = (totalPool * 5) / 100;

        vm.expectEmit(true, false, false, true);
        emit IBetMatch.OrganizerPaymentFailed(address(rejectOrg), fee);
        rejectOrg.setResult(failMatch, IBetMatch.MatchResult.TeamAWins);

        assertTrue(failMatch.organizerPaid());
        assertEq(uint256(failMatch.result()), uint256(IBetMatch.MatchResult.TeamAWins));

        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        failMatch.claimPrize();
        uint256 prizePool = (totalPool * 95) / 100;
        assertEq(bettor1.balance - b1Before, prizePool);
    }

    // ============================================================
    // Edge Case: setResult with Zero Bets
    // ============================================================

    function test_SetResult_ZeroBets() public {
        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.TeamAWins));
        assertFalse(betMatch.organizerPaid());
    }

    function test_SetResult_ZeroBets_Draw() public {
        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        assertEq(uint256(betMatch.result()), uint256(IBetMatch.MatchResult.Draw));
        assertFalse(betMatch.organizerPaid());
    }

    // ============================================================
    // Edge Case: Reentrancy via Organizer in setResult
    // ============================================================

    function test_SetResult_ReentrancyBlocked() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(factory);
        vm.deal(address(attacker), 10 ether);

        vm.prank(address(attacker));
        address atkMatchAddr = attacker.createMatch("Atk A", "Atk B", matchStartTime, BET_AMOUNT);
        BetMatch atkMatch = BetMatch(atkMatchAddr);
        attacker.setTarget(atkMatch);

        vm.prank(address(attacker));
        atkMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.prank(bettor1);
        atkMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);

        attacker.attack();

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 fee = (totalPool * 5) / 100;

        vm.expectEmit(true, false, false, true);
        emit IBetMatch.OrganizerPaymentFailed(address(attacker), fee);
        attacker.setResult(atkMatch, IBetMatch.MatchResult.TeamAWins);

        assertEq(uint256(atkMatch.result()), uint256(IBetMatch.MatchResult.TeamAWins));
        assertTrue(atkMatch.organizerPaid());
        assertFalse(atkMatch.hasClaimed(address(attacker)));
        assertEq(address(atkMatch).balance, totalPool);
    }

    // ============================================================
    // Edge Case: claimPrize TeamBWins Direct Claim
    // ============================================================

    function test_ClaimPrize_TeamBWins_DirectClaim() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        uint256 totalPool = BET_AMOUNT * 2;
        uint256 prizePool = (totalPool * 95) / 100;

        uint256 b2Before = bettor2.balance;
        vm.prank(bettor2);
        betMatch.claimPrize();
        assertEq(bettor2.balance - b2Before, prizePool);
        assertTrue(betMatch.hasClaimed(bettor2));

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.NotAWinner.selector);
        betMatch.claimPrize();
    }

    // ============================================================
    // Edge Case: No Bets on Winning Side
    // ============================================================

    function test_ClaimPrize_NoBetsOnWinningSide() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.NotAWinner.selector);
        betMatch.claimPrize();

        vm.prank(bettor2);
        vm.expectRevert(IBetMatch.NotAWinner.selector);
        betMatch.claimPrize();

        uint256 prize1 = betMatch.calculatePrize(bettor1);
        uint256 prize2 = betMatch.calculatePrize(bettor2);
        assertEq(prize1, 0);
        assertEq(prize2, 0);
    }

    // ============================================================
    // Edge Case: ETH Dust / Rounding
    // ============================================================

    function test_PrizeDistribution_DustHandling() public {
        vm.prank(organizer);
        address dustAddr = factory.createMatch("Dust A", "Dust B", matchStartTime, 1 ether);
        BetMatch dustMatch = BetMatch(dustAddr);

        vm.prank(bettor1);
        dustMatch.placeBet{value: 1 ether}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        dustMatch.placeBet{value: 1 ether}(IBetMatch.Team.TeamA);
        vm.prank(bettor3);
        dustMatch.placeBet{value: 1 ether}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        dustMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = 3 ether;
        uint256 fee = (totalPool * 5) / 100;
        uint256 prizePool = (totalPool * 95) / 100;

        assertTrue(fee + prizePool <= totalPool);

        uint256 prize1 = dustMatch.calculatePrize(bettor1);
        uint256 prize2 = dustMatch.calculatePrize(bettor2);
        assertEq(prize1, prize2);
        assertTrue(prize1 + prize2 <= prizePool);

        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        dustMatch.claimPrize();
        assertEq(bettor1.balance - b1Before, prize1);

        uint256 b2Before = bettor2.balance;
        vm.prank(bettor2);
        dustMatch.claimPrize();
        assertEq(bettor2.balance - b2Before, prize2);

        uint256 contractBalance = address(dustMatch).balance;
        uint256 dust = totalPool - fee - prize1 - prize2;
        assertEq(contractBalance, dust);
    }

    // ============================================================
    // Edge Case: calculatePrize with winningPool=0
    // ============================================================

    function test_CalculatePrize_WinningPoolZero() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 prize = betMatch.calculatePrize(bettor1);
        assertEq(prize, 0);
    }

    // ============================================================
    // Edge Case: Single bet only, winner claims
    // ============================================================

    function test_ClaimPrize_OnlyOneSideBets() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 prizePool = (BET_AMOUNT * 95) / 100;
        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimPrize();
        assertEq(bettor1.balance - b1Before, prizePool);
    }

    // ============================================================
    // Edge Case: claimPrize TransferFailed
    // ============================================================

    function test_ClaimPrize_TransferFailed() public {
        RejectingBettor rBettor = new RejectingBettor();
        vm.deal(address(rBettor), 10 ether);

        vm.prank(organizer);
        address tfMatchAddr = factory.createMatch("TF A", "TF B", matchStartTime, BET_AMOUNT);
        BetMatch tfMatch = BetMatch(tfMatchAddr);

        rBettor.placeBet{value: BET_AMOUNT}(tfMatch, IBetMatch.Team.TeamA);
        vm.prank(bettor1);
        tfMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        tfMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.expectRevert(IBetMatch.TransferFailed.selector);
        rBettor.claimPrize(tfMatch);
    }

    // ============================================================
    // Edge Case: claimRefund TransferFailed
    // ============================================================

    function test_ClaimRefund_TransferFailed() public {
        RejectingBettor rBettor = new RejectingBettor();
        vm.deal(address(rBettor), 10 ether);

        vm.prank(organizer);
        address tfMatchAddr = factory.createMatch("TF A", "TF B", matchStartTime, BET_AMOUNT);
        BetMatch tfMatch = BetMatch(tfMatchAddr);

        rBettor.placeBet{value: BET_AMOUNT}(tfMatch, IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        tfMatch.setResult(IBetMatch.MatchResult.Draw);

        vm.expectRevert(IBetMatch.TransferFailed.selector);
        rBettor.claimRefund(tfMatch);
    }

    // ============================================================
    // Edge Case: claimRefund with pending result
    // ============================================================

    function test_ClaimRefund_PendingResult() public {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.prank(bettor1);
        vm.expectRevert(IBetMatch.MatchNotDraw.selector);
        betMatch.claimRefund();
    }

    // ============================================================
    // Helpers
    // ============================================================

    function _placeBetsAndWarp() internal {
        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);
        vm.warp(matchStartTime + 1);
    }
}
