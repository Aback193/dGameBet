#!/usr/bin/env bash
# fetch-teams.sh — Build static teams.json dataset from TheSportsDB API
#
# Usage: bash scripts/fetch-teams.sh
# Output: frontend/public/data/teams.json
#
# Requirements:
# - curl (for API requests)
# - jq (for JSON processing)
#
# This script fetches team data from TheSportsDB free API for major football leagues
# and consolidates them into a single JSON file for the autocomplete feature.

set -euo pipefail

# API endpoint (free tier, no auth required)
API_BASE="https://www.thesportsdb.com/api/v1/json/3"

# Output directory and file
OUTPUT_DIR="frontend/public/data"
OUTPUT_FILE="$OUTPUT_DIR/teams.json"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Target leagues (TheSportsDB league names)
# Format: "League Name" (used in search_all_teams.php?l=<league>)
declare -a LEAGUES=(
	"English Premier League"
	"English League Championship"
	"Spanish La Liga"
	"German Bundesliga"
	"Italian Serie A"
	"French Ligue 1"
	"Portuguese Liga"
	"Dutch Eredivisie"
	"Turkish Super Lig"
	"Scottish Premier League"
	"Belgian First Division A"
	"Argentine Primera Division"
	"Brazilian Serie A"
	"UEFA Champions League"
	"UEFA Europa League"
)

echo "🏆 Fetching football teams from TheSportsDB..."
echo "📦 Target leagues: ${#LEAGUES[@]}"
echo ""

# Temporary file to collect all teams
TEMP_FILE=$(mktemp)
echo "[]" > "$TEMP_FILE"

# Fetch teams from each league
for league in "${LEAGUES[@]}"; do
	echo "⚽ Fetching: $league"
	
	# URL-encode the league name
	encoded_league=$(echo -n "$league" | jq -sRr @uri)
	
	# Fetch teams from the league
	response=$(curl -s "${API_BASE}/search_all_teams.php?l=${encoded_league}" || echo '{"teams":null}')
	
	# Extract and transform team data
	# Filter: only Soccer teams, exclude null badges
	teams=$(echo "$response" | jq -c '
		.teams // [] | 
		map(
			select(.strSport == "Soccer" and .strBadge != null and .strBadge != "") |
			{
				id: .idTeam,
				name: .strTeam,
				shortName: (.strTeamShort // .strTeam),
				country: .strCountry,
				league: .strLeague,
				badgeUrl: .strBadge,
				keywords: (.strKeywords // "")
			}
		)
	')
	
	# Merge with existing teams
	combined=$(jq -s '.[0] + .[1]' "$TEMP_FILE" <(echo "$teams"))
	echo "$combined" > "$TEMP_FILE"
	
	# Count teams fetched
	count=$(echo "$teams" | jq 'length')
	echo "  ✓ Added $count teams"
	
	# Rate limiting (free tier: 100 req/min, so ~1 req/sec is safe)
	sleep 1
done

echo ""
echo "🔍 Removing duplicates..."

# Remove duplicate teams (same idTeam)
# Sort by name for consistent output
final_teams=$(jq 'unique_by(.id) | sort_by(.name)' "$TEMP_FILE")

# Write final output
echo "$final_teams" > "$OUTPUT_FILE"

# Cleanup
rm "$TEMP_FILE"

# Statistics
total_teams=$(echo "$final_teams" | jq 'length')
file_size=$(du -h "$OUTPUT_FILE" | cut -f1)

echo "✅ Done!"
echo ""
echo "📊 Statistics:"
echo "   Total teams: $total_teams"
echo "   File size: $file_size"
echo "   Output: $OUTPUT_FILE"
echo ""
echo "🎯 Sample teams:"
echo "$final_teams" | jq -r '.[0:5] | .[] | "   - \(.name) (\(.league))"'
