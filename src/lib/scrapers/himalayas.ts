import type { ScrapedJob } from "../types";

interface HimalayasJob {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  url: string;
  applicationUrl?: string;
  companyName: string;
  locationRestrictions: string[];
  timezoneRestrictions: string[];
  categories: string[];
  tags: string[];
  pubDate: string;
  seniority: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

interface HimalayasResponse {
  jobs: HimalayasJob[];
  offset: number;
  limit: number;
  totalCount: number;
}

const SEARCH_QUERIES = [
  "frontend",
  "react",
  "javascript",
  "next.js",
];

/**
 * Himalayas.app - Free public API for remote jobs.
 * Docs: https://himalayas.app/api
 * No auth required.
 */
export async function scrapeHimalayas(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `https://himalayas.app/jobs/api?limit=30&category=Engineering&search=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "JobScraper/1.0 (job aggregation service; contact@example.com)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data: HimalayasResponse = await response.json();

      for (const job of data.jobs || []) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        let salary: string | undefined;
        if (job.salary?.min && job.salary?.max) {
          const currency = job.salary.currency || "USD";
          salary = `${currency} ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}`;
        }

        const location =
          job.locationRestrictions?.length > 0
            ? job.locationRestrictions.join(", ")
            : "Remote (Worldwide)";

        allJobs.push({
          title: job.title,
          company: job.companyName,
          location,
          url: job.applicationUrl || `https://himalayas.app/jobs/${job.id}`,
          description: job.body || job.excerpt,
          source: "himalayas",
          salary_range: salary,
          tags: [...(job.categories || []), ...(job.tags || [])],
          posted_at: job.pubDate,
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      console.error(`Himalayas search "${query}" failed:`, error);
    }
  }

  return allJobs;
}
