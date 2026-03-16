// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BetFactory} from "../src/BetFactory.sol";
import {BetMatch} from "../src/BetMatch.sol";
import {IBetFactory} from "../src/interfaces/IBetFactory.sol";
import {IBetMatch} from "../src/interfaces/IBetMatch.sol";
import {BetMath} from "../src/libraries/BetMath.sol";

contract BetMatchFuzzTest is Test {
    BetFactory public factory;

    address public organizer = makeAddr("organizer");
    uint256 public matchStartTime;

    function setUp() public {
        factory = new BetFactory();
        matchStartTime = block.timestamp + 1 days;
        vm.deal(organizer, 100 ether);
    }

    // ============================================================
    // Basic Fuzz Tests
    // ============================================================

    function testFuzz_PlaceBet_AnyTeam(uint8 team) public {
        vm.assume(team <= 1);
        uint256 betAmount = 0.1 ether;

        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, betAmount);
        BetMatch betMatch = BetMatch(matchAddr);

        address bettor = makeAddr("fuzzyBettor");
        vm.deal(bettor, 1 ether);

        vm.prank(bettor);
        betMatch.placeBet{value: betAmount}(IBetMatch.Team(team));

        if (team == 0) {
            assertEq(betMatch.totalPoolTeamA(), betAmount);
        } else {
            assertEq(betMatch.totalPoolTeamB(), betAmount);
        }
    }

    function testFuzz_BetAmount(uint256 betAmount) public {
        vm.assume(betAmount > 0 && betAmount < 100 ether);

        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, betAmount);
        BetMatch betMatch = BetMatch(matchAddr);

        address bettor = makeAddr("fuzzyBettor");
        vm.deal(bettor, betAmount + 1 ether);

        vm.prank(bettor);
        betMatch.placeBet{value: betAmount}(IBetMatch.Team.TeamA);

        assertEq(betMatch.totalPoolTeamA(), betAmount);
    }

    function testFuzz_PrizeCalculation(uint256 bet1, uint256 bet2) public {
        bet1 = bound(bet1, 0.001 ether, 50 ether);
        bet2 = bound(bet2, 0.001 ether, 50 ether);

        uint256 betAmount = bet1 < bet2 ? bet1 : bet2;

        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, betAmount);
        BetMatch betMatch = BetMatch(matchAddr);

        address bettor1 = makeAddr("bettor1");
        address bettor2 = makeAddr("bettor2");
        vm.deal(bettor1, betAmount + 1 ether);
        vm.deal(bettor2, betAmount + 1 ether);

        vm.prank(bettor1);
        betMatch.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        vm.prank(bettor2);
        betMatch.placeBet{value: betAmount}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        betMatch.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 prize = betMatch.calculatePrize(bettor1);

        uint256 totalPool = betAmount * 2;
        uint256 expectedPrizePool = (totalPool * 95) / 100;
        assertEq(prize, expectedPrizePool);
    }

    function testFuzz_MultipleBettors(uint8 numBettors) public {
        vm.assume(numBettors >= 2 && numBettors <= 20);
        uint256 betAmount = 0.1 ether;

        vm.prank(organizer);
        address matchAddr = factory.createMatch("Team A", "Team B", matchStartTime, betAmount);
        BetMatch betMatch = BetMatch(matchAddr);

        uint256 expectedPoolA;
        uint256 expectedPoolB;

        for (uint256 i = 0; i < numBettors; i++) {
            address bettor = makeAddr(string(abi.encodePacked("bettor", i)));
            vm.deal(bettor, 1 ether);
            vm.prank(bettor);

            if (i % 2 == 0) {
                betMatch.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
                expectedPoolA += betAmount;
            } else {
                betMatch.placeBet{value: betAmount}(IBetMatch.Team.TeamB);
                expectedPoolB += betAmount;
            }
        }

        assertEq(betMatch.totalPoolTeamA(), expectedPoolA);
        assertEq(betMatch.totalPoolTeamB(), expectedPoolB);
    }

    // ============================================================
    // INVARIANT 1: fee + prizePool <= totalPool (no value created)
    // ============================================================

    function testFuzz_Invariant_FeeDecomposition(uint256 totalPool) public pure {
        totalPool = bound(totalPool, 0, type(uint128).max);

        uint256 fee = BetMath.calculateOrganizerFee(totalPool);
        uint256 prizePool = BetMath.calculatePrizePool(totalPool);

        assertTrue(fee + prizePool <= totalPool, "fee + prizePool must never exceed totalPool");

        uint256 dust = totalPool - fee - prizePool;
        assertTrue(dust <= 1, "dust from fee decomposition must be at most 1 wei");
    }

    // ============================================================
    // INVARIANT 2: sum(prizes) <= prizePool (solvency)
    // ============================================================

    function testFuzz_Invariant_PrizeSolvency(
        uint256 betAmount,
        uint8 numWinners,
        uint8 numLosers
    ) public {
        betAmount = bound(betAmount, 1 wei, 10 ether);
        numWinners = uint8(bound(numWinners, 1, 10));
        numLosers = uint8(bound(numLosers, 0, 10));

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, betAmount);
        BetMatch m = BetMatch(matchAddr);

        address[] memory winners = new address[](numWinners);
        for (uint256 i = 0; i < numWinners; i++) {
            winners[i] = makeAddr(string(abi.encodePacked("w", i)));
            vm.deal(winners[i], betAmount + 1 ether);
            vm.prank(winners[i]);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        }

        for (uint256 i = 0; i < numLosers; i++) {
            address loser = makeAddr(string(abi.encodePacked("l", i)));
            vm.deal(loser, betAmount + 1 ether);
            vm.prank(loser);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamB);
        }

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 totalPool = betAmount * (uint256(numWinners) + uint256(numLosers));
        uint256 prizePool = BetMath.calculatePrizePool(totalPool);
        uint256 totalPrizes;

        for (uint256 i = 0; i < numWinners; i++) {
            totalPrizes += m.calculatePrize(winners[i]);
        }

        assertTrue(totalPrizes <= prizePool, "sum of prizes must not exceed prizePool");

        uint256 prizeDust = prizePool - totalPrizes;
        assertTrue(prizeDust < numWinners, "prize dust bounded by winner count");
    }

    // ============================================================
    // INVARIANT 3: contract always has enough ETH (solvency proof)
    // ============================================================

    function testFuzz_Invariant_ContractSolvency_NonDraw(
        uint256 betAmount,
        uint8 numA,
        uint8 numB
    ) public {
        betAmount = bound(betAmount, 0.001 ether, 5 ether);
        numA = uint8(bound(numA, 1, 8));
        numB = uint8(bound(numB, 1, 8));

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, betAmount);
        BetMatch m = BetMatch(matchAddr);

        address[] memory bettorsA = new address[](numA);
        for (uint256 i = 0; i < numA; i++) {
            bettorsA[i] = makeAddr(string(abi.encodePacked("a", i)));
            vm.deal(bettorsA[i], betAmount + 1 ether);
            vm.prank(bettorsA[i]);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        }

        for (uint256 i = 0; i < numB; i++) {
            address b = makeAddr(string(abi.encodePacked("b", i)));
            vm.deal(b, betAmount + 1 ether);
            vm.prank(b);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamB);
        }

        uint256 totalPool = betAmount * (uint256(numA) + uint256(numB));
        assertEq(address(m).balance, totalPool, "contract balance must equal total pool before result");

        vm.warp(matchStartTime + 1);
        uint256 orgBalBefore = organizer.balance;
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.TeamAWins);
        uint256 feePaid = organizer.balance - orgBalBefore;

        for (uint256 i = 0; i < numA; i++) {
            uint256 prize = m.calculatePrize(bettorsA[i]);
            assertTrue(address(m).balance >= prize, "contract must have enough for each claim");

            uint256 bBefore = bettorsA[i].balance;
            vm.prank(bettorsA[i]);
            m.claimPrize();
            uint256 received = bettorsA[i].balance - bBefore;
            assertEq(received, prize, "bettor must receive exactly their calculated prize");
        }

        assertTrue(address(m).balance >= 0, "contract balance must never go negative");
        uint256 expectedDust = totalPool - feePaid;
        for (uint256 i = 0; i < numA; i++) {
            expectedDust -= m.calculatePrize(bettorsA[i]);
        }
    }

    // ============================================================
    // INVARIANT 4: draw refunds exactly equal total pool
    // ============================================================

    function testFuzz_Invariant_DrawRefundSolvency(
        uint256 betAmount,
        uint8 numA,
        uint8 numB
    ) public {
        betAmount = bound(betAmount, 0.001 ether, 5 ether);
        numA = uint8(bound(numA, 1, 8));
        numB = uint8(bound(numB, 1, 8));

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, betAmount);
        BetMatch m = BetMatch(matchAddr);

        address[] memory allBettors = new address[](uint256(numA) + uint256(numB));
        for (uint256 i = 0; i < numA; i++) {
            allBettors[i] = makeAddr(string(abi.encodePacked("da", i)));
            vm.deal(allBettors[i], betAmount + 1 ether);
            vm.prank(allBettors[i]);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        }
        for (uint256 i = 0; i < numB; i++) {
            allBettors[numA + i] = makeAddr(string(abi.encodePacked("db", i)));
            vm.deal(allBettors[numA + i], betAmount + 1 ether);
            vm.prank(allBettors[numA + i]);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamB);
        }

        uint256 totalPool = betAmount * (uint256(numA) + uint256(numB));

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.Draw);

        assertEq(address(m).balance, totalPool, "no fee taken for draws");

        uint256 totalRefunded;
        for (uint256 i = 0; i < allBettors.length; i++) {
            uint256 bBefore = allBettors[i].balance;
            vm.prank(allBettors[i]);
            m.claimRefund();
            totalRefunded += allBettors[i].balance - bBefore;
        }

        assertEq(totalRefunded, totalPool, "all funds must be refunded in a draw");
        assertEq(address(m).balance, 0, "contract must be empty after all draw refunds");
    }

    // ============================================================
    // INVARIANT 5: fee + sum(prizes) + dust = totalPool (conservation of value)
    // ============================================================

    function testFuzz_Invariant_ValueConservation(
        uint256 betAmount,
        uint8 rawNumA,
        uint8 rawNumB
    ) public {
        betAmount = bound(betAmount, 0.01 ether, 5 ether);
        uint256 numA = bound(rawNumA, 1, 6);
        uint256 numB = bound(rawNumB, 1, 6);

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, betAmount);
        BetMatch m = BetMatch(matchAddr);

        address[] memory winnersArr = new address[](numA);
        for (uint256 i = 0; i < numA; i++) {
            winnersArr[i] = makeAddr(string(abi.encodePacked("vc_w", i)));
            vm.deal(winnersArr[i], betAmount + 1 ether);
            vm.prank(winnersArr[i]);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        }
        for (uint256 i = 0; i < numB; i++) {
            address loser = makeAddr(string(abi.encodePacked("vc_l", i)));
            vm.deal(loser, betAmount + 1 ether);
            vm.prank(loser);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamB);
        }

        uint256 totalPool = betAmount * (numA + numB);

        vm.warp(matchStartTime + 1);
        uint256 orgBefore = organizer.balance;
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.TeamAWins);
        uint256 fee = organizer.balance - orgBefore;

        uint256 totalPrizes;
        for (uint256 i = 0; i < numA; i++) {
            uint256 bBefore = winnersArr[i].balance;
            vm.prank(winnersArr[i]);
            m.claimPrize();
            totalPrizes += winnersArr[i].balance - bBefore;
        }

        uint256 contractDust = address(m).balance;

        assertEq(
            fee + totalPrizes + contractDust,
            totalPool,
            "fee + prizes + dust must exactly equal totalPool"
        );
    }

    // ============================================================
    // INVARIANT 6: individual prize proportionality
    // ============================================================

    function testFuzz_Invariant_PrizeProportionality(
        uint256 betAmount,
        uint8 rawMultiple
    ) public {
        betAmount = bound(betAmount, 0.01 ether, 1 ether);
        uint256 multiple = bound(rawMultiple, 1, 5);

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, betAmount);
        BetMatch m = BetMatch(matchAddr);

        address smallBettor = makeAddr("small");
        address bigBettor = makeAddr("big");
        address loser = makeAddr("loser");

        vm.deal(smallBettor, betAmount * (multiple + 1));
        vm.deal(bigBettor, betAmount * (multiple + 1));
        vm.deal(loser, betAmount * (multiple + 1));

        vm.prank(smallBettor);
        m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);

        for (uint256 i = 0; i < multiple; i++) {
            vm.prank(bigBettor);
            m.placeBet{value: betAmount}(IBetMatch.Team.TeamA);
        }

        vm.prank(loser);
        m.placeBet{value: betAmount}(IBetMatch.Team.TeamB);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.TeamAWins);

        uint256 smallPrize = m.calculatePrize(smallBettor);
        uint256 bigPrize = m.calculatePrize(bigBettor);

        uint256 expected = smallPrize * multiple;
        uint256 diff = bigPrize > expected ? bigPrize - expected : expected - bigPrize;
        assertTrue(diff <= multiple, "rounding error must be bounded by multiple");
        assertTrue(bigPrize >= smallPrize, "bigger bet must yield >= prize");
    }

    // ============================================================
    // INVARIANT 7: rating average correctness
    // ============================================================

    function testFuzz_Invariant_RatingAverage(uint8 r1, uint8 r2, uint8 r3) public {
        r1 = uint8(bound(r1, 1, 5));
        r2 = uint8(bound(r2, 1, 5));
        r3 = uint8(bound(r3, 1, 5));

        vm.prank(organizer);
        address matchAddr = factory.createMatch("A", "B", matchStartTime, 0.1 ether);
        BetMatch m = BetMatch(matchAddr);

        address b1 = makeAddr("rb1");
        address b2 = makeAddr("rb2");
        address b3 = makeAddr("rb3");
        vm.deal(b1, 1 ether);
        vm.deal(b2, 1 ether);
        vm.deal(b3, 1 ether);

        vm.prank(b1);
        m.placeBet{value: 0.1 ether}(IBetMatch.Team.TeamA);
        vm.prank(b2);
        m.placeBet{value: 0.1 ether}(IBetMatch.Team.TeamB);
        vm.prank(b3);
        m.placeBet{value: 0.1 ether}(IBetMatch.Team.TeamA);

        vm.warp(matchStartTime + 1);
        vm.prank(organizer);
        m.setResult(IBetMatch.MatchResult.TeamAWins);

        vm.prank(b1);
        factory.rateOrganizer(0, r1);
        vm.prank(b2);
        factory.rateOrganizer(0, r2);
        vm.prank(b3);
        factory.rateOrganizer(0, r3);

        (uint256 avg, uint256 count) = factory.getOrganizerRating(organizer);
        assertEq(count, 3);
        uint256 expectedAvg = (uint256(r1) + uint256(r2) + uint256(r3)) * 100 / 3;
        assertEq(avg, expectedAvg, "average must match manual calculation");
    }
}
