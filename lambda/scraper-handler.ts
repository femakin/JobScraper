import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { filterJobs } from "../src/lib/filter";
import { getEnabledScrapers } from "../src/lib/scrapers/registry";
import type { ScrapedJob, Job, AIJobAnalysis } from "../src/lib/types";
import OpenAI from "openai";
import twilio from "twilio";
import CryptoJS from "crypto-js";

let _supabase: SupabaseClient;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

let _openai: OpenAI;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function hashJob(job: ScrapedJob): string {
  const raw = `${job.title}${job.company}${job.url}`.toLowerCase().trim();
  return CryptoJS.SHA256(raw).toString();
}

async function analyzeJob(job: ScrapedJob): Promise<AIJobAnalysis> {
  const cleanDescription = stripHtml(job.description || "").slice(0, 2000);

  const prompt = `Analyze this job posting for a developer based in Lagos, Nigeria with the following profile:
- Frontend Developer / Engineer (React, Next.js, JavaScript, TypeScript)
- n8n Automation / Workflow Automation Engineer
- Full-stack JavaScript/Node.js capabilities
- Looking for remote roles that hire from Nigeria, Africa, EMEA, or worldwide

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${cleanDescription}

Respond in JSON with:
1. "relevance_score": 0-100 integer.
2. "summary": A concise 2-sentence summary highlighting the role and key requirements
3. "skills": Array of key technical skills mentioned (max 8)

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { relevance_score: 0, summary: "", skills: [] };

    const parsed = JSON.parse(content);
    return {
      relevance_score: Math.min(100, Math.max(0, parsed.relevance_score || 0)),
      summary: parsed.summary || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8) : [],
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return { relevance_score: 50, summary: "Analysis unavailable.", skills: [] };
  }
}

async function filterNewJobs(jobs: ScrapedJob[]): Promise<ScrapedJob[]> {
  if (jobs.length === 0) return [];

  const hashes = jobs.map(hashJob);
  const { data: existing } = await getSupabase()
    .from("jobs")
    .select("job_hash")
    .in("job_hash", hashes);

  const existingSet = new Set(existing?.map((j) => j.job_hash) ?? []);
  return jobs.filter((job) => !existingSet.has(hashJob(job)));
}

async function notifySubscribers(insertedJobs: Job[]): Promise<number> {
  const notifyableJobs = insertedJobs.filter((j) => j.relevance_score >= 60);
  if (notifyableJobs.length === 0) return 0;

  const { data: subscribers } = await getSupabase()
    .from("subscribers")
    .select("*")
    .eq("is_active", true);

  if (!subscribers?.length) return 0;

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const whatsappFrom =
    process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const client = twilio(accountSid, authToken);

  let sentCount = 0;

  for (const job of notifyableJobs) {
    for (const subscriber of subscribers) {
      const minRelevance = subscriber.preferences?.min_relevance ?? 60;
      if (job.relevance_score < minRelevance) continue;

      const salary = job.salary_range ? `\nSalary: ${job.salary_range}` : "";
      const tags = job.tags?.length
        ? `\nSkills: ${job.tags.slice(0, 5).join(", ")}`
        : "";

      const body = [
        `*New Job Alert!*`,
        ``,
        `*${job.title}*`,
        `Company: ${job.company}`,
        `Location: ${job.location}`,
        salary,
        ``,
        `${job.ai_summary || ""}`,
        tags,
        ``,
        `Relevance: ${job.relevance_score}/100`,
        ``,
        `Apply: ${job.url}`,
        ``,
        `_Reply STOP to unsubscribe_`,
      ]
        .filter((line) => line !== undefined)
        .join("\n");

      try {
        const message = await client.messages.create({
          from: whatsappFrom,
          to: `whatsapp:${subscriber.phone_number}`,
          body,
        });

        await getSupabase().from("notifications").insert({
          job_id: job.id,
          subscriber_id: subscriber.id,
          status: "sent",
          twilio_sid: message.sid,
        });
        sentCount++;
      } catch (error) {
        console.error(
          `Notification failed for ${subscriber.phone_number}:`,
          error
        );
        await getSupabase().from("notifications").insert({
          job_id: job.id,
          subscriber_id: subscriber.id,
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }

      await new Promise((r) => setTimeout(r, 1100));
    }

    await getSupabase()
      .from("jobs")
      .update({ is_notified: true })
      .eq("id", job.id);
  }

  return sentCount;
}

interface ScrapeResult {
  source: string;
  sourceName: string;
  jobsFound: number;
  filtered: number;
  newJobs: number;
  error?: string;
}

export async function handler(event: unknown) {
  console.log("Lambda scraper invoked", JSON.stringify(event));

  const scrapers = getEnabledScrapers();
  const allNewJobs: ScrapedJob[] = [];
  const results: ScrapeResult[] = [];

  for (const config of scrapers) {
    const startedAt = new Date().toISOString();
    try {
      console.log(`Running scraper: ${config.id}`);
      const raw = await config.scrape();
      const filtered = config.skipFilter ? raw : filterJobs(raw);
      const newJobs = await filterNewJobs(filtered);

      await getSupabase().from("scrape_runs").insert({
        source: config.id,
        jobs_found: raw.length,
        new_jobs: newJobs.length,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });

      allNewJobs.push(...newJobs);
      results.push({
        source: config.id,
        sourceName: config.name,
        jobsFound: raw.length,
        filtered: filtered.length,
        newJobs: newJobs.length,
      });

      console.log(
        `${config.id}: ${raw.length} found, ${filtered.length} filtered, ${newJobs.length} new`
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Scraper ${config.id} failed:`, errorMsg);

      await getSupabase().from("scrape_runs").insert({
        source: config.id,
        jobs_found: 0,
        new_jobs: 0,
        errors: errorMsg,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });

      results.push({
        source: config.id,
        sourceName: config.name,
        jobsFound: 0,
        filtered: 0,
        newJobs: 0,
        error: errorMsg,
      });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  if (allNewJobs.length === 0) {
    const response = {
      success: true,
      results,
      totalNew: 0,
      notificationsSent: 0,
      timestamp: new Date().toISOString(),
    };
    console.log("Result:", JSON.stringify(response));
    return response;
  }

  // Deduplicate across sources
  const seen = new Set<string>();
  const uniqueJobs = allNewJobs.filter((job) => {
    const hash = hashJob(job);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  // AI analysis in batches of 5
  const analyses = new Map<ScrapedJob, AIJobAnalysis>();
  for (let i = 0; i < uniqueJobs.length; i += 5) {
    const batch = uniqueJobs.slice(i, i + 5);
    const results = await Promise.all(batch.map(analyzeJob));
    batch.forEach((job, idx) => analyses.set(job, results[idx]));
    if (i + 5 < uniqueJobs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Insert jobs with relevance >= 40
  const insertedJobs: Job[] = [];
  for (const [job, analysis] of analyses) {
    if (analysis.relevance_score < 40) continue;

    const hash = hashJob(job);
    const { data, error } = await getSupabase()
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

  // WhatsApp notifications
  const notificationsSent = await notifySubscribers(insertedJobs);

  const response = {
    success: true,
    results,
    totalNew: insertedJobs.length,
    notificationsSent,
    timestamp: new Date().toISOString(),
  };

  console.log("Result:", JSON.stringify(response));
  return response;
}
