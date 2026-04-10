import type { ScrapedJob } from "../types";

interface RemoteOKJob {
  slug: string;
  id: string;
  epoch: number;
  date: string;
  company: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
}

const TAG_QUERIES = [
  "frontend",
  "react",
  "javascript",
  "nextjs",
];

export async function scrapeRemoteOK(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<string>();

  for (const tag of TAG_QUERIES) {
    try {
      const url = `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) continue;

      const data: RemoteOKJob[] = await response.json();
      const jobs = data.slice(1); // first element is metadata

      for (const job of jobs) {
        if (!job.id || seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        let salary: string | undefined;
        if (job.salary_min && job.salary_max) {
          salary = `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`;
        }

        allJobs.push({
          title: job.position,
          company: job.company,
          location: job.location || "Remote",
          url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
          description: job.description || "",
          source: "remoteok",
          salary_range: salary,
          tags: job.tags || [],
          posted_at: job.date,
        });
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`RemoteOK tag "${tag}" failed:`, error);
    }
  }

  return allJobs;
}
