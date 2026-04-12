import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendTelegramBotPlainText } from "@/lib/telegram";

export const maxDuration = 30;

type TelegramChat = { id: number; type: string };

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

function parseStartToken(text: string): string | null {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;
  const cmd = parts[0];
  if (cmd === "/start" || cmd.startsWith("/start@")) {
    const token = parts[1];
    return /^[a-f0-9]{32}$/i.test(token) ? token.toLowerCase() : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = msg.chat.id;
  const text = msg.text?.trim() ?? "";

  if (text === "/unlink" || text.startsWith("/unlink@")) {
    const { data: rows } = await supabaseAdmin
      .from("subscribers")
      .update({
        telegram_chat_id: null,
        telegram_link_token: null,
        telegram_link_expires_at: null,
      })
      .eq("telegram_chat_id", String(chatId))
      .select("id");

    if (rows?.length) {
      await sendTelegramBotPlainText(
        chatId,
        "Telegram job alerts unlinked for this account. You can generate a new link on the website."
      );
    } else {
      await sendTelegramBotPlainText(
        chatId,
        "No subscription was linked to this Telegram account."
      );
    }
    return NextResponse.json({ ok: true });
  }

  const token = parseStartToken(text);
  if (text.startsWith("/start") && !token) {
    await sendTelegramBotPlainText(
      chatId,
      "Open the link from the JobScraper website (after subscribing with your phone) to connect Telegram. Commands: /unlink"
    );
    return NextResponse.json({ ok: true });
  }

  if (!token) {
    return NextResponse.json({ ok: true });
  }

  const nowIso = new Date().toISOString();
  const { data: subscriber, error } = await supabaseAdmin
    .from("subscribers")
    .select("id, telegram_link_expires_at")
    .eq("telegram_link_token", token)
    .maybeSingle();

  if (error || !subscriber) {
    await sendTelegramBotPlainText(
      chatId,
      "This link is invalid or has already been used. Generate a new Telegram link on the website."
    );
    return NextResponse.json({ ok: true });
  }

  if (
    !subscriber.telegram_link_expires_at ||
    subscriber.telegram_link_expires_at < nowIso
  ) {
    await sendTelegramBotPlainText(
      chatId,
      "This link has expired. Generate a new Telegram link on the website."
    );
    return NextResponse.json({ ok: true });
  }

  const { data: taken } = await supabaseAdmin
    .from("subscribers")
    .select("id")
    .eq("telegram_chat_id", String(chatId))
    .neq("id", subscriber.id)
    .maybeSingle();

  if (taken) {
    await sendTelegramBotPlainText(
      chatId,
      "This Telegram account is already linked to another phone subscription. Use /unlink on the other account first."
    );
    return NextResponse.json({ ok: true });
  }

  const { error: updErr } = await supabaseAdmin
    .from("subscribers")
    .update({
      telegram_chat_id: String(chatId),
      telegram_link_token: null,
      telegram_link_expires_at: null,
    })
    .eq("id", subscriber.id)
    .eq("telegram_link_token", token);

  if (updErr) {
    console.error("Telegram link update failed:", updErr);
    await sendTelegramBotPlainText(
      chatId,
      "Could not complete linking. Please try again or contact support."
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramBotPlainText(
    chatId,
    "You will now receive job alerts here as well as on WhatsApp (when both are enabled). Send /unlink anytime to stop Telegram alerts."
  );

  return NextResponse.json({ ok: true });
}
