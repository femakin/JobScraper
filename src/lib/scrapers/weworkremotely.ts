import type { ScrapedJob } from "../types";

const RSS_FEEDS = [
  "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBetween(
  xml: string,
  tag: string
): string {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = xml.indexOf(open);
  if (start === -1) return "";
  const end = xml.indexOf(close, start);
  if (end === -1) return "";
  return xml.slice(start + open.length, end).trim();
}

function extractCDATA(raw: string): string {
  const m = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : raw;
}

function parseTitle(raw: string): { company: string; title: string } {
  const colon = raw.indexOf(": ");
  if (colon > 0) {
    return {
      company: raw.slice(0, colon).trim(),
      title: raw.slice(colon + 2).trim(),
    };
  }
  return { company: "", title: raw.trim() };
}

function parseItems(xml: string): ScrapedJob[] {
  const jobs: ScrapedJob[] = [];
  const parts = xml.split("<item>");

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const endIdx = chunk.indexOf("</item>");
    const item = endIdx > -1 ? chunk.slice(0, endIdx) : chunk;

    const rawTitle = extractCDATA(extractBetween(item, "title"));
    const link = extractBetween(item, "link");
    const pubDate = extractBetween(item, "pubDate");
    const region = extractBetween(item, "region");
    const type = extractBetween(item, "type");
    const descRaw = extractBetween(item, "description");
    const description = stripHtml(extractCDATA(descRaw));

    if (!rawTitle || !link) continue;

    const { company, title } = parseTitle(rawTitle);

    const location = region || "Remote";

    const tags: string[] = [];
    if (type) tags.push(type);

    jobs.push({
      title,
      company: company || "Unknown",
      location,
      url: link,
      description: description.slice(0, 10000),
      source: "weworkremotely",
      tags,
      posted_at: pubDate || undefined,
    });
  }

  return jobs;
}

export async function scrapeWeWorkRemotely(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenUrls = new Set<string>();

  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: {
          "User-Agent":
            "JobScraper/1.0 (job aggregation service; contact@example.com)",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.error(`WWR feed ${feedUrl} returned ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const jobs = parseItems(xml);

      for (const job of jobs) {
        if (seenUrls.has(job.url)) continue;
        seenUrls.add(job.url);
        allJobs.push(job);
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`WWR feed ${feedUrl} failed:`, err);
    }
  }

  return allJobs;
}
