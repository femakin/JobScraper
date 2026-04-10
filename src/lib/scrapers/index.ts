import { supabaseAdmin } from "../supabase/server";
import { filterJobs } from "../filter";
import { filterNewJobs, generateJobHash } from "../dedup";
import { analyzeJobsBatch } from "../openai";
import { notifyAllSubscribers } from "../twilio";
import { getEnabledScrapers, type ScraperConfig } from "./registry";
import type { ScrapedJob, Job } from "../types";
import { PIPELINE_CONFIG } from "../config";

export interface ScrapeResult {
  source: string;
  sourceName: string;
  jobsFound: number;
  filtered: number;
  newJobs: number;
  error?: string;
}

async function runScraper(
  config: ScraperConfig
): Promise<{ jobs: ScrapedJob[]; result: ScrapeResult }> {
  const startedAt = new Date().toISOString();

  try {
    const raw = await config.scrape();
    const filtered = config.skipFilter ? raw : filterJobs(raw);
    const newJobs = await filterNewJobs(filtered);

    await supabaseAdmin
      .from("scrape_runs")
      .delete()
      .eq("source", config.id);
    await supabaseAdmin.from("scrape_runs").insert({
      source: config.id,
      jobs_found: raw.length,
      new_jobs: newJobs.length,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    return {
      jobs: newJobs,
      result: {
        source: config.id,
        sourceName: config.name,
        jobsFound: raw.length,
        filtered: filtered.length,
        newJobs: newJobs.length,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Scraper ${config.id} failed:`, errorMsg);

    await supabaseAdmin
      .from("scrape_runs")
      .delete()
      .eq("source", config.id);
    await supabaseAdmin.from("scrape_runs").insert({
      source: config.id,
      jobs_found: 0,
      new_jobs: 0,
      errors: errorMsg,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });

    return {
      jobs: [],
      result: {
        source: config.id,
        sourceName: config.name,
        jobsFound: 0,
        filtered: 0,
        newJobs: 0,
        error: errorMsg,
      },
    };
  }
}

export async function runAllScrapers(): Promise<{
  results: ScrapeResult[];
  totalNew: number;
  notificationsSent: number;
}> {
  const scrapers = getEnabledScrapers();
  const allNewJobs: ScrapedJob[] = [];
  const results: ScrapeResult[] = [];

  for (const config of scrapers) {
    const { jobs, result } = await runScraper(config);
    allNewJobs.push(...jobs);
    results.push(result);

    // Small delay between scrapers to be respectful of rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (allNewJobs.length === 0) {
    return { results, totalNew: 0, notificationsSent: 0 };
  }

  // Deduplicate across sources (same job listed on multiple boards)
  const seen = new Set<string>();
  const uniqueJobs = allNewJobs.filter((job) => {
    const hash = generateJobHash(job);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  // Run AI analysis on all new unique jobs
  const analyses = await analyzeJobsBatch(uniqueJobs);

  const insertedJobs: Job[] = [];

  for (const [job, analysis] of analyses) {
    if (analysis.relevance_score < PIPELINE_CONFIG.MIN_SCORE_TO_INSERT) continue;

    const hash = generateJobHash(job);
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .insert({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description?.slice(0, 10000),
        source: job.source,
        salary_range: job.salary_range,
        tags: analysis.skills,
        posted_at: job.posted_at,
        relevance_score: analysis.relevance_score,
        ai_summary: analysis.summary,
        job_hash: hash,
        is_notified: false,
      })
      .select()
      .single();

    if (data && !error) {
      insertedJobs.push(data);
    }
  }

  const notifyableJobs = insertedJobs.filter(
    (j) => j.relevance_score >= PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY
  );
  const notificationsSent = await notifyAllSubscribers(notifyableJobs);

  return {
    results,
    totalNew: insertedJobs.length,
    notificationsSent,
  };
}
