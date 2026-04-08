import type { ScrapedJob } from "../types";

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area: string[];
  };
  salary_min?: number;
  salary_max?: number;
  category: {
    label: string;
    tag: string;
  };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

const QUERIES = [
  "frontend developer",
  "react developer",
  "javascript developer",
  "next.js developer",
  "automation engineer",
];

export async function scrapeAdzuna(): Promise<ScrapedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn("Adzuna API credentials not configured, skipping");
    return [];
  }

  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<string>();

  for (const query of QUERIES) {
    const url = new URL(
      "https://api.adzuna.com/v1/api/jobs/gb/search/1"
    );
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("what", query);
    url.searchParams.set("where", "remote");
    url.searchParams.set("results_per_page", "20");
    url.searchParams.set("content-type", "application/json");

    try {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent":
            "JobScraper/1.0 (job aggregation service; contact@example.com)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data: AdzunaResponse = await response.json();

      for (const job of data.results || []) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        let salary: string | undefined;
        if (job.salary_min && job.salary_max) {
          salary = `£${Math.round(job.salary_min).toLocaleString()} - £${Math.round(job.salary_max).toLocaleString()}`;
        }

        allJobs.push({
          title: job.title,
          company: job.company.display_name,
          location: job.location.display_name || "Remote",
          url: job.redirect_url,
          description: job.description,
          source: "adzuna",
          salary_range: salary,
          tags: [job.category?.label].filter(Boolean) as string[],
          posted_at: job.created,
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`Adzuna query "${query}" failed:`, error);
    }
  }

  return allJobs;
}
