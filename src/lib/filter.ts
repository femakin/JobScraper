import type { ScrapedJob } from "./types";

// ---------------------------------------------------------------------------
// ROLE — strictly YOUR roles. Match must be in the TITLE.
//
// If the title is generic (e.g. "Software Engineer"), we require
// the tags to also confirm it's frontend/react/js/automation.
// ---------------------------------------------------------------------------

const TITLE_KEYWORDS = [
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

const GENERIC_TITLES = [
  "software engineer",
  "software developer",
  "engineer",
  "developer",
];

const TAG_QUALIFIERS = [
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

// ---------------------------------------------------------------------------
// LOCATION — strictly Lagos / Nigeria / Africa / EMEA / Worldwide / Anywhere.
//
// A job PASSES only if the location explicitly signals one of these.
// Specific-country jobs (US, UK, Thailand, India, etc.) are REJECTED
// unless they also mention a passing signal.
// ---------------------------------------------------------------------------

const LOCATION_PASS = [
  "worldwide",
  "anywhere",
  "global",
  "africa",
  "nigeria",
  "lagos",
  "emea",
  "europe",
  "sub-saharan",
  "west africa",
  "middle east",
  "all countries",
  "all locations",
  "no restriction",
  // Timezone overlaps with Lagos (WAT = UTC+1)
  "cet",
  "cest",
  "gmt",
  "utc",
  "wat",
];

const COUNTRY_BLOCKLIST = [
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
  // Common codes
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
  // Regions that exclude Africa
  "north america",
  "latin america",
  "latam",
  "americas",
  "asia",
  "apac",
];

// ---------------------------------------------------------------------------
// EXCLUSION — titles you definitely don't want
// ---------------------------------------------------------------------------
const EXCLUSION_KEYWORDS = [
  "senior staff",
  "staff engineer",
  "principal",
  "director",
  "vp ",
  "vice president",
  "c-level",
  "chief",
  "head of",
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
  // Catch generic titles with wrong language
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function lower(text: string | undefined | null): string {
  return (text ?? "").toLowerCase();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * ROLE — the job title must clearly match your roles.
 *
 * 1. Title contains a direct keyword (frontend, react, next.js, n8n, etc.) → PASS
 * 2. Title is generic (software engineer, developer) AND tags confirm
 *    it's frontend/react/js → PASS
 * 3. Otherwise → FAIL
 */
export function isMatchingRole(job: ScrapedJob): boolean {
  const title = lower(job.title);

  if (containsAny(title, TITLE_KEYWORDS)) return true;

  if (containsAny(title, GENERIC_TITLES)) {
    const tagText = lower((job.tags ?? []).join(" "));
    return containsAny(tagText, TAG_QUALIFIERS);
  }

  return false;
}

/**
 * LOCATION — strictly Nigeria / Africa / EMEA / Worldwide / Anywhere.
 *
 * 1. Location explicitly says worldwide/anywhere/africa/nigeria/emea → PASS
 * 2. Location mentions a blocked country/region (US, UK, India, etc.)
 *    without also having a pass signal → FAIL
 * 3. Location is just "Remote" with nothing else → PASS
 *    (bare "Remote" on these boards usually means worldwide)
 * 4. Everything else → FAIL (strict — if we can't confirm it's
 *    open to Nigeria, we skip it)
 */
export function isNigeriaFriendly(job: ScrapedJob): boolean {
  const loc = lower(job.location);

  if (containsAny(loc, LOCATION_PASS)) return true;

  if (containsAny(loc, COUNTRY_BLOCKLIST)) return false;

  const stripped = loc.replace(/[^a-z]/g, "");
  if (stripped === "remote" || stripped === "") return true;

  return false;
}

export function shouldExclude(job: ScrapedJob): boolean {
  return containsAny(lower(job.title), EXCLUSION_KEYWORDS);
}

/**
 * Jobs must have been posted within the last `hours` hours.
 * No date = rejected (strict).
 */
export function isPostedWithinHours(job: ScrapedJob, hours: number): boolean {
  if (!job.posted_at) return false;

  try {
    const posted = new Date(job.posted_at);
    if (isNaN(posted.getTime())) return false;

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return posted >= cutoff;
  } catch {
    return false;
  }
}

export function filterJobs(jobs: ScrapedJob[]): ScrapedJob[] {
  return jobs.filter(
    (job) =>
      isMatchingRole(job) &&
      isNigeriaFriendly(job) &&
      !shouldExclude(job) &&
      isPostedWithinHours(job, 24)
  );
}
