import type { ScrapedJob } from "../types";

interface WorkingNomadsJob {
  url: string;
  title: string;
  description: string;
  company_name: string;
  category_name: string;
  tags: string;
  location: string;
  pub_date: string;
}

const RELEVANT_CATEGORIES = [
  "development",
  "design",
];

/**
 * Working Nomads - Free public JSON API for remote jobs.
 * API returns all categories. We pre-filter to development/design
 * categories before returning.
 */
export async function scrapeWorkingnomads(): Promise<ScrapedJob[]> {
  const url = "https://www.workingnomads.com/api/exposed_jobs/";

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "JobScraper/1.0 (job aggregation service; contact@example.com)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`WorkingNomads API error: ${response.status}`);
  }

  const data: WorkingNomadsJob[] = await response.json();

  return data
    .filter((job) => {
      const cat = (job.category_name || "").toLowerCase();
      return RELEVANT_CATEGORIES.some((rc) => cat.includes(rc));
    })
    .map((job) => ({
      title: job.title,
      company: job.company_name,
      location: job.location || "Remote",
      url: job.url,
      description: job.description || "",
      source: "workingnomads",
      salary_range: undefined,
      tags: job.tags
        ? job.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [job.category_name].filter(Boolean),
      posted_at: job.pub_date,
    }));
}
