import type { ScrapedJob } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GreenhouseJob = Record<string, any>;

const API_URL =
  "https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs?content=true";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseJob(raw: GreenhouseJob): ScrapedJob | null {
  try {
    const title = raw.title?.trim();
    if (!title) return null;

    const location = raw.location?.name || "Nigeria";
    const url = raw.absolute_url || "";
    const description = raw.content ? stripHtml(raw.content).slice(0, 5000) : title;
    const publishedAt = raw.first_published || raw.updated_at;

    const departments: string[] = (raw.departments || []).map(
      (d: { name?: string }) => d.name || ""
    );

    return {
      title,
      company: "Moniepoint",
      location,
      url,
      description,
      source: "moniepoint",
      tags: departments.filter(Boolean),
      posted_at: publishedAt || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Moniepoint — Africa's all-in-one financial ecosystem.
 *
 * Uses Greenhouse's public board API which returns structured JSON.
 * No API key needed. If Greenhouse changes their API format,
 * this returns 0 jobs safely.
 */
export async function scrapeMoniepoint(): Promise<ScrapedJob[]> {
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const jobs: GreenhouseJob[] = data?.jobs || [];

    const parsed: ScrapedJob[] = [];
    for (const raw of jobs) {
      const job = parseJob(raw);
      if (job) parsed.push(job);
    }

    return parsed;
  } catch (error) {
    console.error("Moniepoint scraper failed:", error);
    return [];
  }
}
