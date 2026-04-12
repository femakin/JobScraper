import twilio from "twilio";
import { supabaseAdmin } from "./supabase/server";
import type { Job, Subscriber } from "./types";
import { sendJobWhatsAppMessage } from "./twilio-job-message";
import { sendSubscriberTelegramJobIfLinked } from "./telegram";

export { formatJobMessage } from "./twilio-job-message";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

function getClient() {
  return twilio(accountSid, authToken);
}

let dailyLimitReached = false;

export async function sendJobNotification(
  job: Job,
  subscriber: Subscriber
): Promise<string | null> {
  if (dailyLimitReached) return null;

  try {
    const client = getClient();
    const sid = await sendJobWhatsAppMessage(client, {
      from: whatsappFrom,
      to: `whatsapp:${subscriber.phone_number}`,
      job,
    });

    await supabaseAdmin.from("notifications").insert({
      job_id: job.id,
      subscriber_id: subscriber.id,
      status: "sent",
      twilio_sid: sid,
    });

    return sid;
  } catch (error: any) {
    if (error?.code === 63038 || error?.status === 429) {
      console.warn("Twilio daily message limit reached — skipping remaining notifications");
      dailyLimitReached = true;
      return null;
    }

    console.error(
      `Failed to notify ${subscriber.phone_number} for job ${job.id}:`,
      error
    );

    const baseMsg =
      error instanceof Error ? error.message : "Unknown error";
    const hint63016 =
      error?.code === 63016
        ? " Outside the 24h session window, WhatsApp requires an approved template. Set TWILIO_WHATSAPP_JOB_CONTENT_SID (see README)."
        : "";

    await supabaseAdmin.from("notifications").insert({
      job_id: job.id,
      subscriber_id: subscriber.id,
      status: "failed",
      error_message: baseMsg + hint63016,
    });

    return null;
  }
}

export type NotifyChannelsResult = {
  /** Successful WhatsApp (Twilio) sends logged to `notifications`. */
  whatsappSent: number;
  /** Successful Telegram Bot API sends (optional channel). */
  telegramSent: number;
};

export async function notifyAllSubscribers(
  jobs: Job[],
  options?: { markJobAsNotified?: boolean; skipWhatsApp?: boolean }
): Promise<NotifyChannelsResult> {
  dailyLimitReached = false;
  const markJobAsNotified = options?.markJobAsNotified !== false;
  const skipWhatsApp = options?.skipWhatsApp === true;
  const delayMs = skipWhatsApp ? 100 : 1100;

  const { data: subscribers } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .eq("is_active", true);

  if (!subscribers?.length || !jobs.length) {
    return { whatsappSent: 0, telegramSent: 0 };
  }

  let whatsappSent = 0;
  let telegramSent = 0;

  for (const job of jobs) {
    if (!skipWhatsApp && dailyLimitReached) {
      const idx = jobs.indexOf(job);
      console.log(
        `Daily limit reached — skipping notifications for remaining ${jobs.length - idx} jobs`
      );
      break;
    }

    for (const subscriber of subscribers) {
      if (!skipWhatsApp && dailyLimitReached) break;

      const minRelevance = subscriber.preferences?.min_relevance ?? 60;
      if (job.relevance_score < minRelevance) continue;

      if (!skipWhatsApp) {
        const sid = await sendJobNotification(job, subscriber as Subscriber);
        if (sid) whatsappSent++;
      }

      const tgOk = await sendSubscriberTelegramJobIfLinked(
        job,
        subscriber as Subscriber
      );
      if (tgOk) telegramSent++;

      await new Promise((r) => setTimeout(r, delayMs));
    }

    if (markJobAsNotified) {
      await supabaseAdmin
        .from("jobs")
        .update({ is_notified: true })
        .eq("id", job.id);
    }
  }

  if (!skipWhatsApp && dailyLimitReached) {
    console.log(
      `Sent ${whatsappSent} WhatsApp notifications before hitting Twilio daily limit`
    );
  }

  return { whatsappSent, telegramSent };
}

export async function handleIncomingMessage(
  from: string,
  body: string
): Promise<string> {
  const phone = from.replace("whatsapp:", "");
  const command = body.trim().toUpperCase();

  if (command === "STOP") {
    await supabaseAdmin
      .from("subscribers")
      .update({ is_active: false })
      .eq("phone_number", phone);
    return "You have been unsubscribed from job alerts. Reply RESUME to resubscribe.";
  }

  if (command === "RESUME" || command === "START") {
    const { data } = await supabaseAdmin
      .from("subscribers")
      .select("id")
      .eq("phone_number", phone)
      .single();

    if (data) {
      await supabaseAdmin
        .from("subscribers")
        .update({ is_active: true })
        .eq("phone_number", phone);
      return "Welcome back! You will now receive job alerts again.";
    }

    return "You are not registered. Visit our website to subscribe.";
  }

  return "JobScraper Bot\n\nCommands:\nSTOP - Unsubscribe\nRESUME - Resubscribe\n\nVisit our dashboard to see all jobs!";
}
