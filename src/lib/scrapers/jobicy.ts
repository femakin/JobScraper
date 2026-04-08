import type { ScrapedJob } from "../types";

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobType: string[];
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
  jobExcerpt: string;
  jobDescription: string;
  pubDate: string;
}

interface JobicyResponse {
  apiVersion: string;
  documentationUrl: string;
  friendlyNotice: string;
  jobCount: number;
  lastUpdate: string;
  jobs: JobicyJob[];
}

const TAG_QUERIES = ["frontend", "javascript", "react", "nextjs"];

export async function scrapeJobicy(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<number>();

  for (const tag of TAG_QUERIES) {
    try {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=30&tag=${encodeURIComponent(tag)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "JobScraper/1.0 (job aggregation service; contact@example.com)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const data: JobicyResponse = await response.json();

      for (const job of data.jobs || []) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        let salary: string | undefined;
        if (job.annualSalaryMin && job.annualSalaryMax) {
          const currency = job.salaryCurrency || "USD";
          salary = `${currency} ${job.annualSalaryMin.toLocaleString()} - ${job.annualSalaryMax.toLocaleString()}`;
        }

        allJobs.push({
          title: job.jobTitle,
          company: job.companyName,
          location: job.jobGeo || "Remote",
          url: job.url,
          description: job.jobDescription || job.jobExcerpt,
          source: "jobicy",
          salary_range: salary,
          tags: job.jobType || [],
          posted_at: job.pubDate,
        });
      }

      await new Promise((r) => setTimeout(r, 400));
    } catch (error) {
      console.error(`Jobicy tag "${tag}" failed:`, error);
    }
  }

  return allJobs;
}
