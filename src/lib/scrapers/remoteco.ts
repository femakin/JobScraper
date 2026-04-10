import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

const PAGES = [
  "https://remote.co/remote-jobs/developer/",
  "https://remote.co/remote-jobs/design/",
];

function parseRelativeDate(text: string): string | undefined {
  const now = new Date();
  const lower = text.toLowerCase().trim();

  if (lower === "today") return now.toISOString();
  if (lower === "yesterday") {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }

  const match = lower.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === "hour") now.setHours(now.getHours() - n);
    else if (unit === "day") now.setDate(now.getDate() - n);
    else if (unit === "week") now.setDate(now.getDate() - n * 7);
    else if (unit === "month") now.setMonth(now.getMonth() - n);
    return now.toISOString();
  }

  return undefined;
}

/**
 * Remote.co — scrapes developer & design remote job listings.
 *
 * Remote.co is a Next.js site with server-rendered HTML job cards.
 * Each card has the title, company (h3), location, salary, job type, and date.
 * If the page structure changes, this returns 0 jobs safely.
 */
export async function scrapeRemoteco(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenIds = new Set<string>();

  for (const pageUrl of PAGES) {
    try {
      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      const cards = $("[data-isfreejob]");

      cards.each((_, card) => {
        try {
          const el = $(card);
          const id = el.attr("id");
          if (!id || seenIds.has(id)) return;
          seenIds.add(id);

          const spans = el.find("span");
          let title = "";
          let dateText = "";
          let location = "";

          spans.each((_, sp) => {
            const text = $(sp).text().trim();
            if (!text) return;
            if (
              text === "New!" ||
              text === "Featured" ||
              text.length <= 1
            )
              return;

            if (
              text.match(
                /^(Today|Yesterday|\d+\s*(day|week|month|hour)s?\s*ago)$/i
              )
            ) {
              dateText = text;
              return;
            }

            if (
              text.match(/(Remote|Hybrid|in\s)/i) &&
              text.length > 5
            ) {
              location = text;
              return;
            }

            if (!title && text.length > 3) {
              title = text;
            }
          });

          const company = el.find("h3").first().text().trim();

          const lis = el.find("li");
          const liTexts: string[] = [];
          lis.each((_, li) => {
            liTexts.push($(li).text().trim());
          });

          const salary = liTexts.find((t) =>
            t.match(/\$[\d,]+/)
          );
          const jobType = liTexts.find((t) =>
            t.match(/(Full-Time|Part-Time|Contract|Freelance|Temporary)/i)
          );

          if (!title) return;

          allJobs.push({
            title,
            company: company || "Unknown",
            location: location || "Remote",
            url: `https://remote.co/job-details/${el.find("a[href*='/job-details/']").attr("href")?.split("/job-details/")[1] || id}`,
            description: `${title} at ${company}. ${jobType || ""}. ${location}`,
            source: "remoteco",
            salary_range: salary,
            tags: liTexts.filter(
              (t) =>
                !t.match(/\$/) &&
                !t.match(/(Full-Time|Part-Time|Employee)/i)
            ),
            posted_at: parseRelativeDate(dateText),
          });
        } catch {
          // Skip malformed card
        }
      });

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`Remote.co page ${pageUrl} failed:`, error);
    }
  }

  return allJobs;
}
