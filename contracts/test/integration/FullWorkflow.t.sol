// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BetFactory} from "../../src/BetFactory.sol";
import {BetMatch} from "../../src/BetMatch.sol";
import {IBetMatch} from "../../src/interfaces/IBetMatch.sol";
import {IBetFactory} from "../../src/interfaces/IBetFactory.sol";

contract FullWorkflowTest is Test {
    BetFactory public factory;

    address public organizer = makeAddr("organizer");
    address public bettor1 = makeAddr("bettor1");
    address public bettor2 = makeAddr("bettor2");
    address public bettor3 = makeAddr("bettor3");
    address public bettor4 = makeAddr("bettor4");

    uint256 public constant BET_AMOUNT = 1 ether;
    uint256 public matchStartTime;

    function setUp() public {
        factory = new BetFactory();
        matchStartTime = block.timestamp + 1 days;

        vm.deal(organizer, 100 ether);
        vm.deal(bettor1, 100 ether);
        vm.deal(bettor2, 100 ether);
        vm.deal(bettor3, 100 ether);
        vm.deal(bettor4, 100 ether);
    }

    function test_FullWorkflow_TeamAWins() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Barcelona", "Real Madrid", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);

        uint256 orgBalBefore = organizer.balance;
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 orgFee = organizer.balance - orgBalBefore;
        assertEq(orgFee, (2 ether * 5) / 100);

        uint256 bettor1BalBefore = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimPrize();

        uint256 prize = bettor1.balance - bettor1BalBefore;
        assertEq(prize, (2 ether * 95) / 100);

        IBetFactory.MatchInfo[] memory completed = factory.getCompletedMatches();
        assertEq(completed.length, 1);

        vm.prank(bettor1);
        factory.rateOrganizer(0, 5);

        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(avg, 500);
        assertEq(count, 1);
    }

    function test_FullWorkflow_TeamBWins() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Liverpool", "Man City", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamBWins);

        uint256 bettor2BalBefore = bettor2.balance;
        vm.prank(bettor2);
        betMatch.claimPrize();

        uint256 prize = bettor2.balance - bettor2BalBefore;
        assertEq(prize, (2 ether * 95) / 100);
    }

    function test_FullWorkflow_Draw() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Chelsea", "Arsenal", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.Draw);

        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimRefund();
        assertEq(bettor1.balance - b1Before, BET_AMOUNT);

        uint256 b2Before = bettor2.balance;
        vm.prank(bettor2);
        betMatch.claimRefund();
        assertEq(bettor2.balance - b2Before, BET_AMOUNT);
    }

    function test_FullWorkflow_MultipleBettors() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("PSG", "Bayern", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor3);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);
        vm.prank(bettor4);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);

        uint256 totalPool = 4 ether;
        uint256 prizePool = (totalPool * 95) / 100;

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimPrize();
        assertEq(bettor1.balance - b1Before, prizePool / 2);

        uint256 b2Before = bettor2.balance;
        vm.prank(bettor2);
        betMatch.claimPrize();
        assertEq(bettor2.balance - b2Before, prizePool / 2);
    }

    function test_FullWorkflow_OnlyOneBettor() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Juventus", "AC Milan", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

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

    function test_FullWorkflow_NoLosingBets() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Inter", "Napoli", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = 2 ether;
        uint256 prizePool = (totalPool * 95) / 100;

        uint256 b1Before = bettor1.balance;
        vm.prank(bettor1);
        betMatch.claimPrize();
        assertEq(bettor1.balance - b1Before, prizePool / 2);

        uint256 b2Before = bettor2.balance;
        vm.prank(bettor2);
        betMatch.claimPrize();
        assertEq(bettor2.balance - b2Before, prizePool / 2);
    }

    function test_FullWorkflow_RatingSystem() public {
        vm.prank(organizer);
        address matchAddr = factory.createMatch("Dortmund", "Leipzig", matchStartTime, BET_AMOUNT);
        BetMatch betMatch = BetMatch(matchAddr);

        vm.prank(bettor1);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamB);
        vm.prank(bettor3);
        betMatch.placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(bettor1);
        factory.rateOrganizer(0, 5);
        vm.prank(bettor2);
        factory.rateOrganizer(0, 3);
        vm.prank(bettor3);
        factory.rateOrganizer(0, 4);

        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(count, 3);
        assertEq(avg, 400); // (5+3+4)*100/3 = 400
    }

    function test_FullWorkflow_ActiveCompletedFiltering() public {
        vm.startPrank(organizer);
        address match1 = factory.createMatch("Match 1A", "Match 1B", matchStartTime, BET_AMOUNT);
        factory.createMatch("Match 2A", "Match 2B", matchStartTime + 2 days, BET_AMOUNT);
        vm.stopPrank();

        IBetFactory.MatchInfo[] memory active = factory.getActiveMatches();
        assertEq(active.length, 2);
        IBetFactory.MatchInfo[] memory completed = factory.getCompletedMatches();
        assertEq(completed.length, 0);

        vm.prank(bettor1);
        BetMatch(match1).placeBet{value: BET_AMOUNT}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        BetMatch(match1).setResult(IBetMatch.MatchResult.TeamAWins);

        active = factory.getActiveMatches();
        assertEq(active.length, 1);
        completed = factory.getCompletedMatches();
        assertEq(completed.length, 1);
    }
}
