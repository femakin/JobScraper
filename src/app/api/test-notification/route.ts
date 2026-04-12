import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { formatJobMessage, notifyAllSubscribers } from "@/lib/twilio";
import { PIPELINE_CONFIG } from "@/lib/config";
import type { Job } from "@/lib/types";

export const maxDuration = 120;

/**
 * POST /api/test-notification
 *
 * Sends the **same** WhatsApp job alert as production (Twilio body matches
 * `formatJobMessage`). Use to verify subscribers receive notifications.
 *
 * Auth: Authorization: Bearer <SCRAPE_API_KEY>
 *
 * Body (JSON, all optional):
 *   - job_id: UUID of a row in `jobs` (default: latest job by scraped_at)
 *   - preview_only: if true, returns the message text without sending
 *   - skip_mark_notified: if true, does not set jobs.is_notified (safe to re-run)
 *   - skip_whatsapp: if true, only sends Telegram (for subscribers with a linked chat_id)
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

  let body: {
    job_id?: string;
    preview_only?: boolean;
    skip_mark_notified?: boolean;
    skip_whatsapp?: boolean;
  } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { job_id, preview_only, skip_mark_notified, skip_whatsapp } = body;

  try {
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

    const messageBody = formatJobMessage(job);

    if (preview_only) {
      return NextResponse.json({
        preview_only: true,
        job_id: job.id,
        title: job.title,
        relevance_score: job.relevance_score,
        min_score_to_notify: PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY,
        message_body: messageBody,
      });
    }

    if (job.relevance_score < PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY) {
      return NextResponse.json(
        {
          error: `Job relevance_score (${job.relevance_score}) is below MIN_SCORE_TO_NOTIFY (${PIPELINE_CONFIG.MIN_SCORE_TO_NOTIFY}). Production would not notify for this job.`,
          hint: "Pick another job, lower MIN_SCORE_TO_NOTIFY in config, or use preview_only to inspect the message body only.",
          job_id: job.id,
          message_body: messageBody,
        },
        { status: 422 }
      );
    }

    const { whatsappSent, telegramSent } = await notifyAllSubscribers([job], {
      markJobAsNotified: !skip_mark_notified,
      skipWhatsApp: skip_whatsapp === true,
    });

    return NextResponse.json({
      success: true,
      job_id: job.id,
      notifications_sent: whatsappSent,
      telegram_notifications_sent: telegramSent,
      mark_job_as_notified: !skip_mark_notified,
      skip_whatsapp: skip_whatsapp === true,
    });
  } catch (err) {
    console.error("test-notification failed:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST with Authorization: Bearer <SCRAPE_API_KEY> and optional JSON body",
    body: {
      job_id: "optional UUID — default: latest job in DB",
      preview_only: "optional boolean — return message_body without sending",
      skip_mark_notified:
        "optional boolean — do not set is_notified (repeat tests)",
      skip_whatsapp:
        "optional boolean — skip Twilio; only Telegram for linked subscribers",
    },
    example: `curl -s -X POST http://localhost:3000/api/test-notification \\
  -H "Authorization: Bearer YOUR_SCRAPE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"preview_only":true}'`,
  });
}
