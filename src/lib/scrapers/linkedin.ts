import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

const SEARCH_QUERIES = [
  "frontend developer",
  "react developer",
  "javascript developer",
  "next.js developer",
  "fullstack developer",
  "front-end engineer",
  "typescript developer",
  "Senior Frontend Developer",
  "Senior Frontend Engineer",
  "Senior Frontend Architect",
  "Senior Frontend Designer",
  "Senior Frontend Developer",
  "Senior Frontend Engineer",
  "Senior Frontend Architect",
  "Senior Frontend Designer",
];

const RATE_LIMIT_MS = 3000;
const RESULTS_PER_PAGE = 25;
const MAX_PAGES = 2;

function parseLinkedInDate(datetime: string | undefined): string | undefined {
  if (!datetime) return undefined;

  try {
    const parsed = new Date(datetime);
    if (isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  } catch {
    return undefined;
  }
}

function extractJobId(url: string): string | null {
  const match = url.match(/(\d{5,})/);
  return match ? match[1] : null;
}

/**
 * LinkedIn — public guest jobs API (no authentication required).
 *
 * Uses the same endpoint Google crawls for indexing LinkedIn job listings.
 * Rate-limited to one request every 3 seconds to respect LinkedIn's servers.
 */
export async function scrapeLinkedIn(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const start = page * RESULTS_PER_PAGE;
        const params = new URLSearchParams({
          keywords: query,
          location: "Nigeria",
          f_WT: "2", // remote filter
          start: String(start),
        });

        const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "JobScraper/1.0 (job aggregation service; contact@example.com)",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) break;

        const html = await response.text();
        if (!html.trim()) break;

        const $ = cheerio.load(html);
        let cardsFound = 0;

        $("li").each((_, li) => {
          try {
            const card = $(li);

            const linkEl = card.find("a.base-card__full-link");
            const href = linkEl.attr("href")?.trim();
            if (!href) return;

            const jobId = extractJobId(href);
            if (!jobId || seenIds.has(jobId)) return;
            seenIds.add(jobId);

            const title = card
              .find("h3.base-search-card__title")
              .text()
              .trim();
            if (!title) return;

            const company = card
              .find("h4.base-search-card__subtitle")
              .text()
              .trim() || "Unknown";

            const location = card
              .find("span.job-search-card__location")
              .text()
              .trim() || "Remote";

            const timeEl = card.find("time");
            const datetime = timeEl.attr("datetime");
            const postedAt = parseLinkedInDate(datetime);

            const salaryEl = card.find("span.job-search-card__salary-info");
            const salary = salaryEl.text().trim() || undefined;

            const cleanUrl = href.split("?")[0];

            allJobs.push({
              title,
              company,
              location,
              url: cleanUrl,
              description: `${title} at ${company}. ${location}.${salary ? " Salary: " + salary : ""}`,
              source: "linkedin",
              salary_range: salary,
              tags: [],
              posted_at: postedAt || new Date().toISOString(),
            });

            cardsFound++;
          } catch {
            // Skip malformed card
          }
        });

        if (cardsFound === 0) break;

        await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
      } catch (error) {
        console.error(`LinkedIn search "${query}" page ${page} failed:`, error);
        break;
      }
    }

    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
  }

  return allJobs;
}
