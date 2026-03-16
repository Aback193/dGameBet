/**
 * Team data structure from TheSportsDB
 */
export interface TeamData {
	/** Unique identifier from TheSportsDB */
	id: string;
	/** Full official name, e.g. "FC Barcelona" */
	name: string;
	/** Common short name, e.g. "Barcelona" */
	shortName: string;
	/** Country of origin */
	country: string;
	/** Primary league name */
	league: string;
	/** URL to the team badge image (PNG, hosted on TheSportsDB CDN) */
	badgeUrl: string;
	/** Alternative/nickname search terms, e.g. "Barça" */
	keywords: string;
}
