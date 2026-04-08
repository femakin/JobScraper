import CryptoJS from "crypto-js";
import { supabaseAdmin } from "./supabase/server";
import type { ScrapedJob } from "./types";

export function generateJobHash(job: ScrapedJob): string {
  const raw = `${job.title}${job.company}${job.url}`.toLowerCase().trim();
  return CryptoJS.SHA256(raw).toString();
}

export async function filterNewJobs(
  jobs: ScrapedJob[]
): Promise<ScrapedJob[]> {
  if (jobs.length === 0) return [];

  const hashes = jobs.map(generateJobHash);

  const { data: existing } = await supabaseAdmin
    .from("jobs")
    .select("job_hash")
    .in("job_hash", hashes);

  const existingSet = new Set(existing?.map((j) => j.job_hash) ?? []);

  return jobs.filter((job) => {
    const hash = generateJobHash(job);
    return !existingSet.has(hash);
  });
}
