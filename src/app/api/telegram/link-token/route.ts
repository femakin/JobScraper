import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

function normalizePhone(raw: string): string {
  const t = raw.trim();
  return t.startsWith("+") ? t : `+${t}`;
}

export async function POST(request: NextRequest) {
  try {
    if (
      !process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      !process.env.TELEGRAM_BOT_USERNAME?.trim()
    ) {
      return NextResponse.json(
        { error: "Telegram bot is not configured on this server." },
        { status: 503 }
      );
    }

    const { phone_number } = await request.json();
    if (!phone_number || typeof phone_number !== "string") {
      return NextResponse.json(
        { error: "phone_number is required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone_number);

    const { data: subscriber, error } = await supabaseAdmin
      .from("subscribers")
      .select("id, is_active")
      .eq("phone_number", normalized)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriber) {
      return NextResponse.json(
        {
          error:
            "No subscription found for that number. Subscribe on the website first.",
        },
        { status: 404 }
      );
    }

    if (!subscriber.is_active) {
      return NextResponse.json(
        {
          error: "That subscription is inactive. Resubscribe on WhatsApp or the site first.",
        },
        { status: 400 }
      );
    }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: upErr } = await supabaseAdmin
      .from("subscribers")
      .update({
        telegram_link_token: token,
        telegram_link_expires_at: expiresAt,
      })
      .eq("id", subscriber.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const username = process.env.TELEGRAM_BOT_USERNAME!.trim().replace(/^@/, "");
    const deepLink = `https://t.me/${username}?start=${token}`;

    return NextResponse.json({
      success: true,
      deep_link: deepLink,
      expires_at: expiresAt,
    });
  } catch (e) {
    console.error("telegram/link-token:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
