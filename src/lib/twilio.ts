import twilio from "twilio";
import { supabaseAdmin } from "./supabase/server";
import type { Job, Subscriber } from "./types";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

function getClient() {
  return twilio(accountSid, authToken);
}

function formatJobMessage(job: Job): string {
  const salary = job.salary_range ? `\nSalary: ${job.salary_range}` : "";
  const tags = job.tags?.length ? `\nSkills: ${job.tags.slice(0, 5).join(", ")}` : "";

  return [
    `*New Job Alert!*`,
    ``,
    `*${job.title}*`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    salary,
    ``,
    `${job.ai_summary || ""}`,
    tags,
    ``,
    `Relevance: ${job.relevance_score}/100`,
    ``,
    `Apply: ${job.url}`,
    ``,
    `_Reply STOP to unsubscribe_`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export async function sendJobNotification(
  job: Job,
  subscriber: Subscriber
): Promise<string | null> {
  try {
    const client = getClient();
    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${subscriber.phone_number}`,
      body: formatJobMessage(job),
    });

    await supabaseAdmin.from("notifications").insert({
      job_id: job.id,
      subscriber_id: subscriber.id,
      status: "sent",
      twilio_sid: message.sid,
    });

    return message.sid;
  } catch (error) {
    console.error(
      `Failed to notify ${subscriber.phone_number} for job ${job.id}:`,
      error
    );

    await supabaseAdmin.from("notifications").insert({
      job_id: job.id,
      subscriber_id: subscriber.id,
      status: "failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });

    return null;
  }
}

export async function notifyAllSubscribers(jobs: Job[]): Promise<number> {
  const { data: subscribers } = await supabaseAdmin
    .from("subscribers")
    .select("*")
    .eq("is_active", true);

  if (!subscribers?.length || !jobs.length) return 0;

  let sentCount = 0;

  for (const job of jobs) {
    for (const subscriber of subscribers) {
      const minRelevance = subscriber.preferences?.min_relevance ?? 60;
      if (job.relevance_score < minRelevance) continue;

      const sid = await sendJobNotification(job, subscriber);
      if (sid) sentCount++;

      // Rate limit: Twilio allows ~1 msg/sec on trial
      await new Promise((r) => setTimeout(r, 1100));
    }

    await supabaseAdmin
      .from("jobs")
      .update({ is_notified: true })
      .eq("id", job.id);
  }

  return sentCount;
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
