/**
 * Central configuration for the entire pipeline.
 *
 * Edit this file to customize what jobs you're looking for, which locations
 * are accepted, what roles to exclude, and how the scoring/notification
 * thresholds behave. Changes apply to local dev, API routes, and Lambda.
 */

// ─── Target Roles ────────────────────────────────────────────────────────────
// Job title must contain one of these keywords to pass the role filter.

export const TITLE_KEYWORDS = [
  "frontend",
  "senior frontend",
  "senior front-end",
  "senior front end",
  "senior front end developer",
  "senior front-end developer",
  "senior front end engineer",
  "senior front-end engineer",
  "senior front end designer",
  "senior front-end designer",
  "senior front end architect",
  "frontend engineer",
  "frontend developer",
  "front-end engineer",
  "front-end developer",
  "front end engineer",
  "front end developer",
  "react engineer",
  "react developer",
  "next.js engineer",
  "next.js developer",
  "front-end",
  "front end",
  "react",
  "react.js",
  "reactjs",
  "next.js",
  "nextjs",
  "n8n",
  "automation engineer",
  "automation developer",
  "workflow automation",
  "integration engineer",
  "javascript engineer",
  "typescript engineer",
  "javascript developer",
  "typescript developer",
  "ui developer",
  "ui engineer",
  "ux engineer",
  "web developer",
  "web engineer",
  "full stack",
  "fullstack",
  "full-stack",
];

// ─── Generic Titles ──────────────────────────────────────────────────────────
// If a title matches one of these AND the job's tags contain a TAG_QUALIFIER,
// the job passes the role filter. Without qualifying tags, it's rejected.

export const GENERIC_TITLES = [
  "software engineer",
  "software developer",
  "engineer",
  "developer",
];

// ─── Tag Qualifiers ──────────────────────────────────────────────────────────
// Used to confirm a generic title is actually a frontend/JS role.

export const TAG_QUALIFIERS = [
  "frontend",
  "front-end",
  "react",
  "react.js",
  "reactjs",
  "next.js",
  "nextjs",
  "javascript",
  "typescript",
  "n8n",
  "automation",
  "tailwind",
  "vue",
  "angular",
  "svelte",
];

// ─── Accepted Locations ──────────────────────────────────────────────────────
// Job location must contain one of these to pass. Bare "Remote" also passes.

export const LOCATION_PASS = [
  "worldwide",
  "anywhere",
  "global",
  "africa",
  "nigeria",
  "lagos",
  "emea",
  // "europe",
  "sub-saharan",
  "west africa",
  // "middle east",
  "all countries",
  "all locations",
  "no restriction",
  "cet",
  "cest",
  "gmt",
  "utc",
  "wat",
];

// ─── Blocked Locations ───────────────────────────────────────────────────────
// If the location mentions one of these (and no LOCATION_PASS signal), reject.

export const COUNTRY_BLOCKLIST = [
  "united states",
  "united kingdom",
  "canada",
  "australia",
  "germany",
  "france",
  "india",
  "brazil",
  "japan",
  "china",
  "south korea",
  "singapore",
  "thailand",
  "indonesia",
  "mexico",
  "argentina",
  "colombia",
  "chile",
  "peru",
  "poland",
  "romania",
  "czech",
  "hungary",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "switzerland",
  "austria",
  "netherlands",
  "belgium",
  "spain",
  "italy",
  "portugal",
  "ireland",
  "israel",
  "turkey",
  "ukraine",
  "philippines",
  "vietnam",
  "malaysia",
  "taiwan",
  "pakistan",
  "sri lanka",
  "bangladesh",
  " us",
  " uk",
  " gb",
  " ca",
  " au",
  " de",
  " fr",
  " in",
  " br",
  " jp",
  " th",
  " sg",
  "north america",
  "latin america",
  "latam",
  "americas",
  "asia",
  "apac",
];

// ─── Excluded Title Keywords ─────────────────────────────────────────────────
// If a job title contains any of these, it's rejected outright.

export const EXCLUSION_KEYWORDS = [
  // Seniority levels outside scope
  "senior staff",
  "staff engineer",
  "principal",
  "director",
  "vp ",
  "vice president",
  "c-level",
  "chief",
  "head of",
  // Wrong domain
  "data scientist",
  "data analyst",
  "data engineer",
  "machine learning",
  "ml engineer",
  "ai engineer",
  "devops",
  "sre ",
  "site reliability",
  "platform engineer",
  "ios developer",
  "ios engineer",
  "android developer",
  "android engineer",
  "mobile developer",
  "mobile engineer",
  "embedded",
  "firmware",
  "blockchain",
  "solidity",
  "web3",
  // Wrong primary language
  "rust developer",
  "rust engineer",
  "go developer",
  "go engineer",
  "golang",
  "ruby developer",
  "ruby engineer",
  "php developer",
  "php engineer",
  "java developer",
  "java engineer",
  "c++ developer",
  "c# developer",
  ".net developer",
  ".net engineer",
  "python developer",
  "python engineer",
  "backend developer",
  "backend engineer",
  "back-end developer",
  "back-end engineer",
  "back end developer",
  "salesforce",
  "sap ",
  // Non-engineering
  "qa engineer",
  "qa analyst",
  "test engineer",
  "security engineer",
  "network engineer",
  "cloud engineer",
  "infrastructure",
  "database admin",
  "dba",
  "product manager",
  "project manager",
  "scrum master",
  "product designer",
  "graphic designer",
  "marketing",
  "sales ",
  "customer success",
  "support engineer",
  "technical writer",
  // Generic titles with wrong language hint
  "java ",
  "java/",
  "python ",
  "python/",
  "ruby ",
  "ruby/",
  "c++ ",
  "c# ",
  " .net ",
  " php ",
  " go ",
  " rust ",
  " kotlin ",
  " swift ",
  " scala ",
  " elixir ",
];

// ─── Pipeline Thresholds ─────────────────────────────────────────────────────

export const PIPELINE_CONFIG = {
  /** Maximum age (hours) for a job to pass the recency filter */
  RECENCY_HOURS: 24,

  /**
   * How to handle jobs with no posted_at date.
   *  - "reject": reject outright (strictest — no date = no pass)
   *  - "assume_recent": treat as posted now, but capped per source by MAX_DATELESS_PER_SOURCE
   */
  MISSING_DATE_STRATEGY: "assume_recent" as "assume_recent" | "reject",

  /** Max dateless jobs allowed per scraper source (only applies when MISSING_DATE_STRATEGY = "assume_recent") */
  MAX_DATELESS_PER_SOURCE: 3,

  /** Minimum relevance score to insert a job into the database (0-100) */
  MIN_SCORE_TO_INSERT: 40,

  /** Minimum relevance score to trigger subscriber notifications (0-100) */
  MIN_SCORE_TO_NOTIFY: 60,

  /** Delay between scraper runs (ms) */
  DELAY_BETWEEN_SCRAPERS_MS: 1000,

  /** Delay between OpenAI analysis batches (ms) */
  DELAY_BETWEEN_AI_BATCHES_MS: 200,

  /** Number of jobs to analyze per OpenAI batch */
  AI_BATCH_SIZE: 5,
};
