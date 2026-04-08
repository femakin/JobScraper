import * as cheerio from "cheerio";
import type { ScrapedJob } from "../types";

const SEARCH_QUERIES = [
  "frontend+developer",
  "front-end+developer",
  "front-end+engineer",
  "react+developer",
  "javascript+developer",
  "next.js+developer",
  "n8n+developer",
  "automation+engineer",
  "automation+developer",
  "workflow+automation",
  "integration+engineer",
  "javascript+engineer",
  "typescript+engineer",
  "javascript+developer",
  "typescript+developer",
  "senior+software+engineer",
  "senior+software+developer",
  "senior+frontend+engineer",
  "senior+frontend+developer",
  "senior+backend+engineer",
  "senior+backend+developer",
  "senior+full+stack+engineer",
  "senior+full+stack+developer",
  "senior+javascript+engineer",
  "senior+javascript+developer",
  "senior+typescript+engineer",
  "senior+typescript+developer",
  "senior+react+engineer",
  "senior+react+developer",
  "senior+next.js+engineer",
  "senior+next.js+developer",
];

function parseRelativeDate(text: string): string | undefined {
  const now = new Date();
  const lower = text.toLowerCase().trim();

  if (lower === "today") return now.toISOString();
  if (lower === "yesterday") {
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
 * Jobberman — Nigeria's largest job board.
 *
 * The HTML uses `data-cy="listing-title-link"` anchors with a `title` attribute
 * for job titles. Company, location, salary, and dates are in sibling elements.
 * All Jobberman jobs are Nigeria-based by default.
 */
export async function scrapeJobberman(): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  const seenSlugs = new Set<string>();

  for (const query of SEARCH_QUERIES) {
    try {
      const url = `https://www.jobberman.com/jobs?q=${query}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });

      // console.log(response, "response");

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $('a[data-cy="listing-title-link"]').each((_, el) => {
        try {
          const anchor = $(el);
          const href = anchor.attr("href") || "";
          const slugMatch = href.match(/\/listings\/([\w-]+)/);
          if (!slugMatch) return;

          const slug = slugMatch[1];
          if (seenSlugs.has(slug)) return;
          seenSlugs.add(slug);

          const title =
            anchor.attr("title")?.trim() ||
            anchor.find("p").first().text().trim() ||
            anchor.text().trim();
          if (!title || title.length < 3) return;

          // Walk up to the card container.
          // Structure: a → div.flex → div.w-full → div(card with border)
          // The card div usually has py-3 or border-t classes.
          let card = anchor.parent().parent().parent().parent();
          // If the card seems too small, go one more level
          if (card.find("p").length < 3) card = card.parent();

          const cardText = card
            .clone()
            .find("script")
            .remove()
            .end()
            .text()
            .replace(/\s+/g, " ")
            .trim();

          // Company: <p> with blue text right after the title
          const companyP = card.find("p.text-blue-700").first();
          const company = companyP.text().trim() || "Unknown";

          // Location & job type from span badges
          const badges: string[] = [];
          card.find("span.rounded").each((_, sp) => {
            badges.push($(sp).text().trim());
          });

          const locBadge = badges.find((b) =>
            b.match(
              /(Lagos|Abuja|Remote|Nigeria|Nationwide|Ibadan|Port Harcourt|Kano)/i
            )
          );
          const location = locBadge
            ? locBadge.includes("Nigeria") || locBadge.includes("Lagos")
              ? locBadge
              : `${locBadge}, Nigeria`
            : "Nigeria";

          const typeBadge = badges.find((b) =>
            b.match(/(Full Time|Part Time|Contract|Internship)/i)
          );

          // Salary
          const salaryMatch = cardText.match(
            /NGN\s*[\d,]+\s*-\s*[\d,]+/i
          );
          const salary = salaryMatch?.[0];

          // Date — the date <p> is sometimes one level above the
          // card we found. Search card first, then parent.
          let dateText = "";
          const dateSearch = card.parent();
          dateSearch.find("p").each((_, p) => {
            const t = $(p).text().trim();
            if (
              t.match(
                /^(Today|Yesterday|\d+\s*(?:day|week|month|hour|minute)s?\s*ago)$/i
              )
            ) {
              dateText = t;
            }
          });
          if (!dateText) {
            const allText = dateSearch.text().replace(/\s+/g, " ");
            const dateMatch = allText.match(
              /(Today|Yesterday|\d+\s*(?:day|week|month|hour|minute)s?\s*ago)/i
            );
            dateText = dateMatch?.[0] || "";
          }
          const postedAt = dateText
            ? parseRelativeDate(dateText)
            : undefined;

          allJobs.push({
            title,
            company,
            location,
            url: href,
            description: `${title} at ${company}. ${typeBadge || ""}. ${location}. ${salary ? "Salary: " + salary : ""}`,
            source: "jobberman",
            salary_range: salary,
            tags: [
              "Nigeria",
              ...(typeBadge ? [typeBadge] : []),
            ],
            posted_at: postedAt,
          });
        } catch {
          // Skip malformed card
        }
      });

      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`Jobberman search "${query}" failed:`, error);
    }
  }

  return allJobs;
}
