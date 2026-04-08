import { NextRequest, NextResponse } from "next/server";
import { SCRAPERS, getScraperById, getAllScraperIds } from "@/lib/scrapers/registry";
import { filterJobs, isMatchingRole, isNigeriaFriendly, isPostedWithinHours } from "@/lib/filter";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "remotive";
  const showAll = searchParams.get("all") === "true";

  // Special case: list all available sources
  if (source === "list") {
    return NextResponse.json({
      sources: SCRAPERS.map((s) => ({
        id: s.id,
        name: s.name,
        website: s.website,
        enabled: s.enabled,
      })),
    });
  }

  const config = getScraperById(source);
  if (!config) {
    return NextResponse.json(
      {
        error: `Unknown source: "${source}"`,
        available: getAllScraperIds(),
        hint: "Use ?source=list to see all sources with details",
      },
      { status: 400 }
    );
  }

  try {
    const startTime = Date.now();
    const rawJobs = await config.scrape();
    const scrapeTime = Date.now() - startTime;

    const filtered = filterJobs(rawJobs);

    const jobSummaries = (showAll ? rawJobs : filtered).map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      salary: job.salary_range || null,
      tags: job.tags?.slice(0, 5),
      posted_at: job.posted_at || null,
      is_matching_role: isMatchingRole(job),
      is_nigeria_friendly: isNigeriaFriendly(job),
      is_within_24h: isPostedWithinHours(job, 24),
      url: job.url,
    }));

    return NextResponse.json({
      source: config.id,
      source_name: config.name,
      source_website: config.website,
      scrape_time_ms: scrapeTime,
      raw_count: rawJobs.length,
      filtered_count: filtered.length,
      showing: showAll ? "all (unfiltered)" : "filtered only (matching role + Nigeria-friendly + last 24h)",
      hint: showAll
        ? "Remove ?all=true to see only filtered jobs"
        : "Add ?all=true to see all raw jobs before filtering",
      jobs: jobSummaries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Scraper "${source}" failed`,
        message: error instanceof Error ? error.message : "Unknown error",
        hint: source === "adzuna"
          ? "Adzuna requires ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local"
          : "Check if the API is reachable",
      },
      { status: 500 }
    );
  }
}
