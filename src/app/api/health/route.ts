import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

interface ServiceCheck {
  status: "ok" | "error" | "not_configured";
  message: string;
  latency_ms?: number;
}

async function checkSupabase(): Promise<ServiceCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("placeholder")) {
    return { status: "not_configured", message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("jobs").select("id").limit(1);
    const latency = Date.now() - start;

    if (error) {
      if (error.message.includes("does not exist")) {
        return { status: "error", message: "Tables not created yet. Run schema.sql in Supabase SQL Editor.", latency_ms: latency };
      }
      return { status: "error", message: error.message, latency_ms: latency };
    }

    return { status: "ok", message: "Connected, tables exist", latency_ms: latency };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Connection failed", latency_ms: Date.now() - start };
  }
}

async function checkOpenAI(): Promise<ServiceCheck> {
  const key = process.env.OPENAI_API_KEY;

  if (!key || key === "placeholder" || key === "sk-...") {
    return { status: "not_configured", message: "OPENAI_API_KEY missing" };
  }

  const start = Date.now();
  try {
    const openai = new OpenAI({ apiKey: key });
    await openai.models.list();
    return { status: "ok", message: "API key valid", latency_ms: Date.now() - start };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Auth failed", latency_ms: Date.now() - start };
  }
}

async function checkTwilio(): Promise<ServiceCheck> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid === "placeholder") {
    return { status: "not_configured", message: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing" };
  }

  const start = Date.now();
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    const account = await client.api.accounts(sid).fetch();
    return { status: "ok", message: `Account: ${account.friendlyName}`, latency_ms: Date.now() - start };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Auth failed", latency_ms: Date.now() - start };
  }
}

async function checkScraperAPIs(): Promise<Record<string, ServiceCheck>> {
  const { SCRAPERS } = await import("@/lib/scrapers/registry");
  const results: Record<string, ServiceCheck> = {};

  const healthUrls: Record<string, string> = {
    remotive: "https://remotive.com/api/remote-jobs?limit=1",
    remoteok: "https://remoteok.com/api",
    jobicy: "https://jobicy.com/api/v2/remote-jobs?count=1",
    himalayas: "https://himalayas.app/jobs/api?limit=1",
    workingnomads: "https://www.workingnomads.com/api/exposed_jobs/",
    jobberman: "https://www.jobberman.com/jobs?q=frontend+developer",
    adzuna: "https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=1dda950d&app_key=f20c7a14d09f33bf1f190385be48254b&results_per_page=1&what=developer",
    arcdev: "https://arc.dev/remote-jobs",
    remoteco: "https://remote.co/remote-jobs/developer/",
    moniepoint: "https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs",
    myjobmag: "https://www.myjobmag.com/jobs-by-title/frontend-developer-remote",
  };

  for (const scraper of SCRAPERS) {
    if (scraper.id === "adzuna") {
      const adzunaId = process.env.ADZUNA_APP_ID;
      const adzunaKey = process.env.ADZUNA_APP_KEY;
      if (adzunaId && adzunaKey) {
        const start = Date.now();
        try {
          const res = await fetch(
            `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${adzunaId}&app_key=${adzunaKey}&results_per_page=1&what=developer`,
            { signal: AbortSignal.timeout(10000) }
          );
          results.adzuna = {
            status: res.ok ? "ok" : "error",
            message: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
            latency_ms: Date.now() - start,
          };
        } catch (err) {
          results.adzuna = { status: "error", message: err instanceof Error ? err.message : "Unreachable", latency_ms: Date.now() - start };
        }
      } else {
        results.adzuna = { status: "not_configured", message: "ADZUNA_APP_ID/KEY not set (optional)" };
      }
      continue;
    }

    const url = healthUrls[scraper.id];
    if (!url) continue;

    const htmlScrapers = new Set(["arcdev", "remoteco", "jobberman", "myjobmag"]);
    const timeout = htmlScrapers.has(scraper.id) ? 20000 : 10000;

    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/json,*/*",
        },
        signal: AbortSignal.timeout(timeout),
      });
      results[scraper.id] = {
        status: res.ok ? "ok" : "error",
        message: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status} ${res.statusText}`,
        latency_ms: Date.now() - start,
      };
    } catch (err) {
      results[scraper.id] = {
        status: "error",
        message: err instanceof Error ? err.message : "Unreachable",
        latency_ms: Date.now() - start,
      };
    }
  }

  return results;
}

export async function GET() {
  const [supabase, openai, twilio, scrapers] = await Promise.all([
    checkSupabase(),
    checkOpenAI(),
    checkTwilio(),
    checkScraperAPIs(),
  ]);

  const coreServices = { supabase, openai, twilio };
  const coreHasError = Object.values(coreServices).some(
    (s) => s.status === "error"
  );
  const coreNotConfigured = Object.values(coreServices).some(
    (s) => s.status === "not_configured"
  );

  const scraperValues = Object.values(scrapers);
  const failedScrapers = scraperValues.filter((s) => s.status === "error").length;
  const totalScrapers = scraperValues.length;

  const overallStatus = coreHasError
    ? "unhealthy"
    : coreNotConfigured
      ? "partially_configured"
      : failedScrapers > 0
        ? `degraded (${totalScrapers - failedScrapers}/${totalScrapers} scrapers ok)`
        : "healthy";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      supabase,
      openai,
      twilio,
      scrapers,
    },
  });
}
