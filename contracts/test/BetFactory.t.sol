// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BetFactory} from "../src/BetFactory.sol";
import {BetMatch} from "../src/BetMatch.sol";
import {IBetFactory} from "../src/interfaces/IBetFactory.sol";
import {IBetMatch} from "../src/interfaces/IBetMatch.sol";

contract BetFactoryTest is Test {
    BetFactory public factory;

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
    }

    // ============================================================
    // createMatch Tests
    // ============================================================

    function test_CreateMatch_Success() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Barcelona", "Real Madrid", matchStartTime, BET_AMOUNT);

        assertTrue(matchAddr != address(0));
        assertEq(factory.getMatchCount(), 1);

        IBetFactory.MatchInfo memory info = factory.getMatch(0);
        assertEq(info.matchContract, matchAddr);
        assertEq(info.organizer, organizer);
        assertEq(info.teamA, "Barcelona");
        assertEq(info.teamB, "Real Madrid");
        assertEq(info.matchStartTime, matchStartTime);
        assertEq(info.betAmount, BET_AMOUNT);
        assertFalse(info.isCompleted);
    }

    function test_CreateMatch_EmitsEvent() public {
        vm.prank(organizer);
        vm.expectEmit(true, false, true, true);
        emit IBetFactory.MatchCreated(0, address(0), organizer, "Barcelona", "Real Madrid", matchStartTime, BET_AMOUNT);
        factory.createMatch("Barcelona", "Real Madrid", matchStartTime, BET_AMOUNT);
    }

    function test_CreateMatch_InvalidTeamNameA() public {
        vm.prank(organizer);
        vm.expectRevert(IBetFactory.InvalidTeamName.selector);
        factory.createMatch("", "Real Madrid", matchStartTime, BET_AMOUNT);
    }

    function test_CreateMatch_InvalidTeamNameB() public {
        vm.prank(organizer);
        vm.expectRevert(IBetFactory.InvalidTeamName.selector);
        factory.createMatch("Barcelona", "", matchStartTime, BET_AMOUNT);
    }

    function test_CreateMatch_InvalidStartTime() public {
        vm.prank(organizer);
        vm.expectRevert(IBetFactory.InvalidStartTime.selector);
        factory.createMatch("Barcelona", "Real Madrid", block.timestamp, BET_AMOUNT);
    }

    function test_CreateMatch_InvalidStartTimePast() public {
        vm.prank(organizer);
        vm.expectRevert(IBetFactory.InvalidStartTime.selector);
        factory.createMatch("Barcelona", "Real Madrid", block.timestamp - 1, BET_AMOUNT);
    }

    function test_CreateMatch_InvalidBetAmount() public {
        vm.prank(organizer);
        vm.expectRevert(IBetFactory.InvalidBetAmount.selector);
        factory.createMatch("Barcelona", "Real Madrid", matchStartTime, 0);
    }

    // ============================================================
    // getActiveMatches Tests
    // ============================================================

    function test_GetActiveMatches_Empty() public view {
        IBetFactory.MatchInfo[] memory active = factory.getActiveMatches();
        assertEq(active.length, 0);
    }

    function test_GetActiveMatches_MultipleMatches() public {
        vm.startPrank(organizer);
        factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);
        factory.createMatch("Team C", "Team D", matchStartTime + 1 hours, BET_AMOUNT);
        vm.stopPrank();

        IBetFactory.MatchInfo[] memory active = factory.getActiveMatches();
        assertEq(active.length, 2);
    }

    function test_GetActiveMatches_ExcludesCompleted() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.deal(bettor1, 1 ether);
        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        IBetFactory.MatchInfo[] memory active = factory.getActiveMatches();
        assertEq(active.length, 0);
    }

    function test_GetActiveMatches_IncludesStartedButNotCompleted() public {
        vm.prank(organizer);
        factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        IBetFactory.MatchInfo[] memory activeBefore = factory.getActiveMatches();
        assertEq(activeBefore.length, 1);

        vm.warp(matchStartTime + 1);

        IBetFactory.MatchInfo[] memory activeAfter = factory.getActiveMatches();
        assertEq(activeAfter.length, 1, "Started-but-not-completed match must remain active");
    }

    // ============================================================
    // getCompletedMatches Tests
    // ============================================================

    function test_GetCompletedMatches_Empty() public view {
        IBetFactory.MatchInfo[] memory completed = factory.getCompletedMatches();
        assertEq(completed.length, 0);
    }

    function test_GetCompletedMatches_AfterResult() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.Draw);

        IBetFactory.MatchInfo[] memory completed = factory.getCompletedMatches();
        assertEq(completed.length, 1);
    }

    // ============================================================
    // getMatch Tests
    // ============================================================

    function test_GetMatch_NotFound() public {
        vm.expectRevert(IBetFactory.MatchNotFound.selector);
        factory.getMatch(999);
    }

    function test_GetMatchCount() public {
        assertEq(factory.getMatchCount(), 0);

        vm.prank(organizer);
        factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);
        assertEq(factory.getMatchCount(), 1);
    }

    // ============================================================
    // rateOrganizer Tests
    // ============================================================

    function test_RateOrganizer_Success() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        factory.rateOrganizer(0, 5);

        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(avg, 500);
        assertEq(count, 1);
    }

    function test_RateOrganizer_EmitsEvent() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        vm.expectEmit(true, true, true, true);
        emit IBetFactory.OrganizerRated(organizer, bettor1, 0, 5);
        factory.rateOrganizer(0, 5);
    }

    function test_RateOrganizer_NotBettor() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor2);
        vm.expectRevert(IBetFactory.NotABettor.selector);
        factory.rateOrganizer(0, 5);
    }

    function test_RateOrganizer_AlreadyRated() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        factory.rateOrganizer(0, 5);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.AlreadyRated.selector);
        factory.rateOrganizer(0, 5);
    }

    function test_RateOrganizer_InvalidRatingZero() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.InvalidRating.selector);
        factory.rateOrganizer(0, 0);
    }

    function test_RateOrganizer_InvalidRatingSix() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.InvalidRating.selector);
        factory.rateOrganizer(0, 6);
    }

    function test_RateOrganizer_MatchNotCompleted() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.MatchNotCompleted.selector);
        factory.rateOrganizer(0, 5);
    }

    function test_RateOrganizer_MatchNotFound() public {
        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.MatchNotFound.selector);
        factory.rateOrganizer(999, 5);
    }

    // ============================================================
    // getOrganizerRating Tests
    // ============================================================

    function test_GetOrganizerRating_NoRatings() public view {
        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(avg, 0);
        assertEq(count, 0);
    }

    function test_GetOrganizerRating_MultipleRatings() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        factory.rateOrganizer(0, 5);
        vm.prank(bettor2);
        factory.rateOrganizer(0, 3);

        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(avg, 400); // (5+3)*100/2 = 400
        assertEq(count, 2);
    }

    // ============================================================
    // markMatchCompleted & recordBet Tests
    // ============================================================

    function test_MarkMatchCompleted_Unauthorized() public {
        vm.prank(organizer);
        factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.Unauthorized.selector);
        factory.markMatchCompleted(0);
    }

    function test_MarkMatchCompleted_MatchNotFound() public {
        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.MatchNotFound.selector);
        factory.markMatchCompleted(999);
    }

    function test_RecordBet_Unauthorized() public {
        vm.prank(organizer);
        factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.Unauthorized.selector);
        factory.recordBet(0, bettor1);
    }

    function test_RecordBet_MatchNotFound() public {
        vm.prank(bettor1);
        vm.expectRevert(IBetFactory.MatchNotFound.selector);
        factory.recordBet(999, bettor1);
    }

    // ============================================================
    // getAllMatches Tests
    // ============================================================

    function test_GetAllMatches() public {
        vm.startPrank(organizer);
        address matchAddr1 = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);
        factory.createMatch("Team C", "Team D", matchStartTime + 1 hours, BET_AMOUNT);
        vm.stopPrank();

        vm.prank(bettor1);
        BetMatch(matchAddr1).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr1).setResult(IBetMatch.MatchResult.TeamAWins);

        IBetFactory.MatchInfo[] memory all = factory.getAllMatches();
        assertEq(all.length, 2);
        assertTrue(all[0].isCompleted);
        assertFalse(all[1].isCompleted);
    }

    // ============================================================
    // deployBlock Tests
    // ============================================================

    function test_DeployBlock_IsSetOnDeployment() public view {
        assertGt(factory.deployBlock(), 0);
    }

    // ============================================================
    // recordBet / markMatchCompleted Success Path Tests
    // ============================================================

    function test_RecordBet_Success() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        assertTrue(factory.hasBet(bettor1, 0));
        assertFalse(factory.hasBet(bettor2, 0));
    }

    function test_MarkMatchCompleted_Success() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, BET_AMOUNT);

        vm.prank(bettor1);
        BetMatch(matchAddr).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        IBetFactory.MatchInfo memory infoBefore = factory.getMatch(0);
        assertFalse(infoBefore.isCompleted);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(matchAddr).setResult(IBetMatch.MatchResult.TeamAWins);

        IBetFactory.MatchInfo memory infoAfter = factory.getMatch(0);
        assertTrue(infoAfter.isCompleted);
    }
}
