import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

const RSS_URL = "https://jobsinnigeria.careers/feed/";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLocation(content: string): string {
  const match = content.match(
    /Location:\s*<\/strong>\s*([^<\n]+)/i
  );
  if (match) {
    const loc = match[1].replace(/<br\s*\/?>/gi, "").trim();
    if (loc) return loc;
  }
  return "Nigeria";
}

function parseCompany(title: string): { jobTitle: string; company: string } {
  const atMatch = title.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { jobTitle: atMatch[1].trim(), company: atMatch[2].trim() };
  }
  return { jobTitle: title, company: "Unknown" };
}

/**
 * JobsInNigeria.careers — Nigeria-focused job board.
 *
 * WordPress-based site with a clean RSS feed at /feed/.
 * Each <item> has <title>, <link>, <pubDate>, <description>,
 * and <content:encoded> with full HTML job details.
 *
 * RSS feeds are explicitly designed for consumption — zero legal risk.
 */
export async function scrapeJobsInNigeria(): Promise<ScrapedJob[]> {
  try {
    const response = await fetch(RSS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const $ = cheerio.load(xml, { xml: true });

    const allJobs: ScrapedJob[] = [];
    const seenUrls = new Set<string>();

    $("item").each((_, el) => {
      try {
        const item = $(el);

        const rawTitle = item.find("title").text().trim();
        if (!rawTitle) return;

        const link = item.find("link").text().trim();
        if (!link || seenUrls.has(link)) return;
        seenUrls.add(link);

        const pubDate = item.find("pubDate").text().trim();
        let postedAt: string | undefined;
        if (pubDate) {
          const parsed = new Date(pubDate);
          if (!isNaN(parsed.getTime())) {
            postedAt = parsed.toISOString();
          }
        }

        const contentEncoded =
          item.find("content\\:encoded").text() ||
          item.find("encoded").text() ||
          "";
        const description = item.find("description").text().trim();

        const { jobTitle, company } = parseCompany(rawTitle);
        const location = parseLocation(contentEncoded);
        const descText = stripHtml(contentEncoded || description).slice(0, 5000);

        allJobs.push({
          title: jobTitle,
          company,
          location,
          url: link,
          description: descText || `${jobTitle} at ${company}. ${location}`,
          source: "jobsinnigeria",
          tags: ["Nigeria"],
          posted_at: postedAt || new Date().toISOString(),
        });
      } catch {
        // Skip malformed item
      }
    });

    return allJobs;
  } catch (error) {
    console.error("JobsInNigeria scraper failed:", error);
    return [];
  }
}
