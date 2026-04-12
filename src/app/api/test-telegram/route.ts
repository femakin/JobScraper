import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatJobMessagePlain } from "@/lib/twilio-job-message";
import { sendTelegramJobMessage, isTelegramBotConfigured } from "@/lib/telegram";
import { PIPELINE_CONFIG } from "@/lib/config";
import type { Job } from "@/lib/types";

export const maxDuration = 60;

/**
 * POST /api/test-telegram — send one job-style alert to a Telegram chat_id.
 * Auth: Bearer SCRAPE_API_KEY. Does not touch subscribers or WhatsApp.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.SCRAPE_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramBotConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not set" },
      { status: 503 }
    );
  }

  let body: {
    chat_id: string;
    job_id?: string;
    preview_only?: boolean;
  };
  try {
    const text = await request.text();
    if (!text) {
      return NextResponse.json(
        { error: "JSON body required with chat_id" },
        { status: 400 }
      );
    }
    body = JSON.parse(text) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { chat_id, job_id, preview_only } = body;
  if (!chat_id || typeof chat_id !== "string") {
    return NextResponse.json(
      { error: "chat_id is required (string)" },
      { status: 400 }
    );
  }

  let job: Job | null = null;

  if (job_id) {
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    job = data as Job | null;
  } else {
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .order("scraped_at", { ascending: false })
      .limit(1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    job = (data?.[0] as Job | undefined) ?? null;
  }

  if (!job) {
    return NextResponse.json(
      {
        error: job_id
          ? "No job found for that job_id"
          : "No jobs in database — run a scrape first or pass job_id",
      },
      { status: 404 }
    );
  }

  const messageBody = formatJobMessagePlain(job);

  if (preview_only) {
    return NextResponse.json({
      preview_only: true,
      chat_id,
      job_id: job.id,
      message_body: messageBody,
    });
  }

  if (job.relevance_score < PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY) {
    return NextResponse.json(
      {
        error: `Job relevance_score (${job.relevance_score}) is below MIN_SCORE_TO_NOTIFY (${PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY}).`,
        hint: "Use preview_only: true to inspect the body, or pick another job.",
        job_id: job.id,
        message_body: messageBody,
      },
      { status: 422 }
    );
  }

  const result = await sendTelegramJobMessage(chat_id.trim(), job);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.description,
        job_id: job.id,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    chat_id: chat_id.trim(),
    job_id: job.id,
    telegram_message_id: result.message_id,
  });
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST with Authorization: Bearer <SCRAPE_API_KEY> and JSON { chat_id, job_id?, preview_only? }",
    note: "Get chat_id from Telegram (e.g. message @userinfobot) or by linking via the site bot.",
    example: `curl -s -X POST http://localhost:3000/api/test-telegram \\
  -H "Authorization: Bearer YOUR_SCRAPE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"chat_id":"123456789","preview_only":true}'`,
  });
}
