import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJob = Record<string, any>;

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  NL: "Netherlands", CA: "Canada", AU: "Australia", NG: "Nigeria",
  ZA: "South Africa", KE: "Kenya", GH: "Ghana", IN: "India",
  BR: "Brazil", ES: "Spain", PT: "Portugal", IT: "Italy",
  SE: "Sweden", PL: "Poland", RO: "Romania", IE: "Ireland",
};

function formatCountries(codes: unknown): string {
  if (!Array.isArray(codes) || codes.length === 0) return "Remote (Worldwide)";
  if (codes.length > 10) return "Remote (Worldwide)";
  return codes
    .slice(0, 5)
    .map((c) => (typeof c === "string" ? COUNTRY_NAMES[c] || c : String(c)))
    .join(", ");
}

function formatSalary(job: AnyJob): string | undefined {
  const minAnnual = job.minAnnualSalary;
  const maxAnnual = job.maxAnnualSalary;
  if (typeof minAnnual === "number" && typeof maxAnnual === "number") {
    return `$${minAnnual.toLocaleString()} - $${maxAnnual.toLocaleString()}/yr`;
  }
  const minHr = job.minHourlyRate;
  const maxHr = job.maxHourlyRate;
  if (typeof minHr === "number" && typeof maxHr === "number") {
    return `$${minHr} - $${maxHr}/hr`;
  }
  return undefined;
}

function safeTags(categories: unknown): string[] {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((c): c is { name: string } => c && typeof c.name === "string")
    .map((c) => c.name)
    .slice(0, 10);
}

function safeDate(epoch: unknown): string | undefined {
  if (typeof epoch !== "number" || epoch <= 0) return undefined;
  try {
    return new Date(epoch * 1000).toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Safely convert a raw object from Arc.dev's __NEXT_DATA__ into a ScrapedJob.
 * Every field access uses defensive checks so a single malformed job object
 * never crashes the entire scraper.
 */
function parseArcJob(raw: AnyJob, isFeatured: boolean): ScrapedJob | null {
  try {
    const key = raw.randomKey ?? raw.id ?? raw.urlString;
    const title = raw.title;
    if (typeof key !== "string" || typeof title !== "string") return null;

    const tags = safeTags(raw.categories);
    const companyName = isFeatured
      ? "Arc.dev Exclusive"
      : raw.company?.name || "Unknown";
    const urlSlug = isFeatured
      ? `details/${raw.urlString}-${key}`
      : `j/${raw.company?.urlString ?? "company"}-${raw.urlString}-${key}`;

    return {
      title,
      company: companyName,
      location: formatCountries(raw.requiredCountries),
      url: `https://arc.dev/remote-jobs/${urlSlug}`,
      description: `${title} at ${companyName}. ${raw.jobType ?? "remote"} position. Skills: ${tags.join(", ")}`,
      source: "arcdev",
      salary_range: isFeatured ? formatSalary(raw) : undefined,
      tags,
      posted_at: safeDate(raw.postedAt),
    };
  } catch {
    return null;
  }
}

/**
 * Arc.dev scraper — fetches front-end / JS / React remote jobs.
 *
 * Arc.dev is a Next.js site that embeds structured job data as __NEXT_DATA__
 * JSON in the page HTML. We fetch the public page and extract that JSON —
 * no API key, no login, no anti-bot issues.
 *
 * Resilience:
 *  - Each page and each job is wrapped in its own try/catch.
 *  - If Arc.dev changes their HTML structure or removes __NEXT_DATA__,
 *    this scraper returns an empty array (0 jobs) — it never throws,
 *    and the other scrapers continue running normally.
 */
export async function scrapeArcdev(): Promise<ScrapedJob[]> {
  const pages = [
    "https://arc.dev/remote-jobs/front-end",
    "https://arc.dev/remote-jobs/javascript",
    "https://arc.dev/remote-jobs/react",
  ];

  const allJobs: ScrapedJob[] = [];
  const seenKeys = new Set<string>();

  for (const pageUrl of pages) {
    try {
      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (!nextDataScript) continue;

      let pageProps: AnyJob;
      try {
        const parsed = JSON.parse(nextDataScript);
        pageProps = parsed?.props?.pageProps;
      } catch {
        continue;
      }
      if (!pageProps || typeof pageProps !== "object") continue;

      const jobArrays: { list: AnyJob[]; featured: boolean }[] = [
        { list: Array.isArray(pageProps.arcJobs) ? pageProps.arcJobs : [], featured: true },
        { list: Array.isArray(pageProps.externalJobs) ? pageProps.externalJobs : [], featured: false },
      ];

      for (const { list, featured } of jobArrays) {
        for (const raw of list) {
          const key = raw?.randomKey ?? raw?.id ?? raw?.urlString;
          if (!key || seenKeys.has(key)) continue;
          seenKeys.add(key);

          const job = parseArcJob(raw, featured);
          if (job) allJobs.push(job);
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`Arc.dev page ${pageUrl} failed:`, error);
    }
  }

  return allJobs;
}
