import twilioSdk from "twilio";
import type { Job } from "./types";

type TwilioClient = ReturnType<typeof twilioSdk>;

/**
 * Freeform WhatsApp body (session message — only works within ~24h of user
 * messaging your Twilio WhatsApp number, unless you use a template).
 */
/** Plain-text job alert (e.g. Telegram) — same content as `formatJobMessage` without WhatsApp markdown. */
export function formatJobMessagePlain(job: Job): string {
  const salary = job.salary_range ? `\nSalary: ${job.salary_range}` : "";
  const tags = job.tags?.length ? `\nSkills: ${job.tags.slice(0, 5).join(", ")}` : "";

  return [
    `New Job Alert!`,
    ``,
    `${job.title}`,
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
    `WhatsApp: reply STOP to unsubscribe.`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export function formatJobMessage(job: Job): string {
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

/**
 * Variables for an approved Twilio / WhatsApp **Content** template.
 * Your template body must declare exactly these placeholders: {{1}} … {{6}}
 * (Twilio Content editor → add variables in order).
 *
 * Example approved body (UTILITY category):
 *   New job match
 *
 *   *{{1}}* at {{2}}
 *   Location: {{3}}
 *
 *   {{4}}
 *
 *   Apply: {{5}}
 *   Relevance: {{6}}/100
 *
 *   Reply STOP to unsubscribe
 */
export function jobAlertTemplateVariables(job: Job): Record<string, string> {
  const summary = (job.ai_summary || "").replace(/\s+/g, " ").trim().slice(0, 900);
  return {
    "1": job.title.slice(0, 200),
    "2": job.company.slice(0, 120),
    "3": (job.location || "Remote").slice(0, 120),
    "4": summary || "—",
    "5": job.url.slice(0, 2000),
    "6": String(job.relevance_score),
  };
}

function messageRouting(
  from: string,
  to: string
): { from: string; to: string } | { messagingServiceSid: string; to: string } {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (messagingServiceSid) {
    return { messagingServiceSid, to };
  }
  return { from, to };
}

/**
 * Sends a job alert: tries freeform `body` first; on Twilio **63016** (outside
 * the 24h customer care window), retries with Content template if
 * `TWILIO_WHATSAPP_JOB_CONTENT_SID` is set.
 *
 * Optional `TWILIO_MESSAGING_SERVICE_SID`: Twilio’s template examples often use a
 * [Messaging Service](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)
 * (`MG...`) together with `contentSid` / `contentVariables`. If set, `from` is omitted
 * and Twilio selects the WhatsApp sender from that service.
 */
export async function sendJobWhatsAppMessage(
  client: TwilioClient,
  params: {
    from: string;
    to: string;
    job: Job;
  }
): Promise<string> {
  const { from, to, job } = params;
  const contentSid = process.env.TWILIO_WHATSAPP_JOB_CONTENT_SID?.trim();
  const route = messageRouting(from, to);

  try {
    const message = await client.messages.create({
      ...route,
      body: formatJobMessage(job),
    });
    return message.sid;
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 63016 && contentSid) {
      const message = await client.messages.create({
        ...route,
        contentSid,
        contentVariables: JSON.stringify(jobAlertTemplateVariables(job)),
      });
      return message.sid;
    }
    throw err;
  }
}
