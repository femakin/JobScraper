import type { ScrapedJob } from "../types";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  candidate_required_location: string;
  description: string;
  salary: string;
  publication_date: string;
  tags: string[];
}

interface RemotiveResponse {
  "job-count": number;
  jobs: RemotiveJob[];
}

const SEARCHES = [
  "frontend",
  "react",
  "javascript",
  "next.js",
  "n8n",
];

export async function scrapeRemotive(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<number>();

  for (const search of SEARCHES) {
    try {
      const url = `https://remotive.com/api/remote-jobs?category=software-dev&search=${encodeURIComponent(search)}&limit=30`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "JobScraper/1.0 (job aggregation service; contact@example.com)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data: RemotiveResponse = await response.json();

      for (const job of data.jobs) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        allJobs.push({
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || "Remote",
          url: job.url,
          description: job.description,
          source: "remotive",
          salary_range: job.salary || undefined,
          tags: job.tags || [],
          posted_at: job.publication_date,
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      console.error(`Remotive search "${search}" failed:`, error);
    }
  }

  return allJobs;
}
