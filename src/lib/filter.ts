import type { ScrapedJob } from "./types";
import {
  PIPELINE_CONFIG,
  TITLE_KEYWORDS,
  GENERIC_TITLES,
  TAG_QUALIFIERS,
  LOCATION_PASS,
  COUNTRY_BLOCKLIST,
  EXCLUSION_KEYWORDS,
} from "./config";

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

    const now = Date.now();
    if (posted.getTime() > now) return false;

    const cutoff = new Date(now - hours * 60 * 60 * 1000);
    return posted >= cutoff;
  } catch {
    return false;
  }
}

export function filterJobs(jobs: ScrapedJob[]): ScrapedJob[] {
  const datelessCountBySource: Record<string, number> = {};

  return jobs.filter((job) => {
    if (!isMatchingRole(job)) return false;
    if (!isNigeriaFriendly(job)) return false;
    if (shouldExclude(job)) return false;

    if (!job.posted_at) {
      if (PIPELINE_CONFIG.MISSING_DATE_STRATEGY === "reject") return false;

      const src = job.source ?? "unknown";
      const count = datelessCountBySource[src] ?? 0;
      if (count >= PIPELINE_CONFIG.MAX_DATELESS_PER_SOURCE) return false;
      datelessCountBySource[src] = count + 1;

      job.posted_at = new Date().toISOString();
    }

    if (!isPostedWithinHours(job, PIPELINE_CONFIG.RECENCY_HOURS)) return false;
    return true;
  });
}
