import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

const SEARCH_PAGES = [
  "https://www.myjobmag.com/jobs-by-title/frontend-developer-remote",
  "https://www.myjobmag.com/jobs-by-title/react-developer",
  "https://www.myjobmag.com/jobs-by-title/javascript-developer",
  "https://www.myjobmag.com/jobs-by-title/frontend-engineer",
  "https://www.myjobmag.com/jobs-by-title/next.js-developer",
  "https://www.myjobmag.com/jobs-by-title/full-stack-developer",
];

function parseRelativeDate(text: string): string | undefined {
  const now = new Date();
  const lower = text.toLowerCase().trim();

  if (lower.includes("today") || lower.includes("just now")) {
    return now.toISOString();
  }
  if (lower.includes("yesterday")) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }

  const match = lower.match(/(\d+)\s*(day|week|month|hour|minute)s?\s*ago/);
  if (match) {
    const n = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === "minute") now.setMinutes(now.getMinutes() - n);
    else if (unit === "hour") now.setHours(now.getHours() - n);
    else if (unit === "day") now.setDate(now.getDate() - n);
    else if (unit === "week") now.setDate(now.getDate() - n * 7);
    else if (unit === "month") now.setMonth(now.getMonth() - n);
    return now.toISOString();
  }

  return undefined;
}

/**
 * MyJobMag — Nigeria's leading job board.
 *
 * Server-rendered HTML with clean structure:
 *   ul.job-list > li.job-list-li
 *     li.job-info > h2 > a (title + company in text, href = detail URL)
 *     li.job-desc (description)
 *     li.job-item (location, type, date)
 *
 * Cloudflare is present but does not block server-side requests.
 * If the structure changes, this returns 0 jobs safely.
 */
export async function scrapeMyJobMag(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenUrls = new Set<string>();

  for (const pageUrl of SEARCH_PAGES) {
    try {
      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $("li.job-list-li").each((_, el) => {
        try {
          const card = $(el);
          const anchor = card.find("li.job-info h2 a").first();
          if (!anchor.length) return;

          const href = anchor.attr("href") || "";
          if (!href || seenUrls.has(href)) return;
          seenUrls.add(href);

          const rawText = anchor.text().trim();
          // Format is "Title at Company"
          const atIndex = rawText.lastIndexOf(" at ");
          let title: string;
          let company: string;
          if (atIndex > 0) {
            title = rawText.slice(0, atIndex).trim();
            company = rawText.slice(atIndex + 4).trim();
          } else {
            title = rawText;
            company = "Unknown";
          }

          if (!title || title.length < 3) return;

          const url = href.startsWith("http")
            ? href
            : `https://www.myjobmag.com${href}`;

          const descText = card.find("li.job-desc").text().trim();
          const itemTexts: string[] = [];
          card.find("li.job-item").each((_, item) => {
            itemTexts.push($(item).text().trim());
          });

          const location =
            itemTexts.find((t) =>
              t.match(
                /(Lagos|Abuja|Remote|Nigeria|Nationwide|Ibadan|Port Harcourt|Kano|Hybrid)/i
              )
            ) || "Nigeria";

          const jobType = itemTexts.find((t) =>
            t.match(/(Full Time|Part Time|Contract|Internship|Freelance)/i)
          );

          let dateText = "";
          card.find("li.job-item").each((_, item) => {
            const t = $(item).text().trim();
            if (
              t.match(
                /(Today|Yesterday|Just now|\d+\s*(?:day|week|month|hour|minute)s?\s*ago)/i
              )
            ) {
              dateText = t;
            }
          });

          allJobs.push({
            title,
            company,
            location,
            url,
            description:
              descText ||
              `${title} at ${company}. ${jobType || ""}. ${location}`,
            source: "myjobmag",
            tags: [
              "Nigeria",
              ...(jobType ? [jobType] : []),
            ],
            posted_at: parseRelativeDate(dateText),
          });
        } catch {
          // Skip malformed card
        }
      });

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`MyJobMag page ${pageUrl} failed:`, error);
    }
  }

  return allJobs;
}
