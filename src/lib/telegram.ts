import type { Job, Subscriber } from "./types";
import { formatJobMessagePlain } from "./twilio-job-message";

const TG_API = "https://api.telegram.org";

export function isTelegramBotConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

const TELEGRAM_TEXT_MAX = 4000;

/**
 * Sends a plain-text job alert via the Bot API. Does not throw on HTTP errors;
 * returns `{ ok: false, description }` instead.
 */
export async function sendTelegramJobMessage(
  chatId: string,
  job: Job
): Promise<{ ok: true; message_id: number } | { ok: false; description: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN not set" };

  let text = formatJobMessagePlain(job);
  if (text.length > TELEGRAM_TEXT_MAX) {
    text = `${text.slice(0, TELEGRAM_TEXT_MAX - 24)}\n\n…(truncated)`;
  }

  const url = `${TG_API}/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    result?: { message_id: number };
    description?: string;
  };

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      description: data.description || `HTTP ${res.status}`,
    };
  }

  return { ok: true, message_id: data.result!.message_id };
}

/** Fire-and-forget bot reply (link / unlink / errors). */
export async function sendTelegramBotPlainText(
  chatId: number | string,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  const body =
    text.length > TELEGRAM_TEXT_MAX
      ? `${text.slice(0, TELEGRAM_TEXT_MAX - 24)}\n\n…(truncated)`
      : text;
  await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: body }),
  });
}

export async function sendSubscriberTelegramJobIfLinked(
  job: Job,
  subscriber: Pick<Subscriber, "id" | "telegram_chat_id">
): Promise<boolean> {
  const chatId = subscriber.telegram_chat_id?.trim();
  if (!chatId || !isTelegramBotConfigured()) return false;

  const result = await sendTelegramJobMessage(chatId, job);
  if (!result.ok) {
    console.error(
      `Telegram notify failed for subscriber ${subscriber.id}:`,
      result.description
    );
    return false;
  }
  return true;
}
