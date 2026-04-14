/**
 * WhatsApp Group Listener
 *
 * Monitors configured WhatsApp groups for job postings, parses them with
 * OpenAI, and stores them in the whatsapp_job_submissions staging table.
 *
 * Usage:
 *   npx tsx scripts/whatsapp-listener.ts              # start listening
 *   npx tsx scripts/whatsapp-listener.ts --list-groups # discover group JIDs
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 * Optional env var:  WHATSAPP_GROUP_IDS (comma-separated JIDs)
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { createClient } from "@supabase/supabase-js";
import { connectWhatsApp } from "../src/lib/whatsapp-client.js";
import { parseJobMessage } from "../src/lib/whatsapp-parser.js";
import type { WASocket } from "@whiskeysockets/baileys";
import { proto } from "@whiskeysockets/baileys";

// ---------------------------------------------------------------------------
// Supabase (standalone — not using Next.js server module)
// ---------------------------------------------------------------------------
let _supabase: ReturnType<typeof createClient>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GROUP_IDS = (process.env.WHATSAPP_GROUP_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const LIST_GROUPS_MODE = process.argv.includes("--list-groups");

const MIN_MESSAGE_LENGTH = 80;

const JOB_SIGNAL_KEYWORDS = [
  "hiring", "we're hiring", "we are hiring", "we are looking",
  "looking for", "we need", "vacancy", "vacancies", "open position",
  "open role", "job opening", "apply now", "apply here", "apply via",
  "apply at", "apply through", "send cv", "send resume", "send your cv",
  "send your resume", "join our team", "join the team",
  "is hiring", "is looking for", "is recruiting",
  "urgently needed", "urgently hiring", "immediate hire",
  "full-time", "full time", "part-time", "part time", "contract",
  "freelance", "internship", "intern",
  "salary", "compensation", "per month", "per annum", "monthly",
  "remote position", "onsite", "on-site", "hybrid",
  "years of experience", "years experience", "yrs experience",
  "responsibilities", "requirements", "qualifications",
  "job description", "role:", "position:",
];

function hasJobSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return JOB_SIGNAL_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// List groups mode
// ---------------------------------------------------------------------------
async function listGroups(sock: WASocket) {
  console.log("\n[WhatsApp] Fetching groups...\n");

  const groups = await sock.groupFetchAllParticipating();
  const entries = Object.values(groups);

  if (entries.length === 0) {
    console.log("You don't belong to any groups.");
  } else {
    console.log(`Found ${entries.length} group(s):\n`);
    console.log("─".repeat(80));

    for (const group of entries) {
      console.log(`  Name: ${group.subject}`);
      console.log(`  JID:  ${group.id}`);
      console.log(`  Size: ${group.participants?.length ?? "?"} members`);
      console.log("─".repeat(80));
    }

    console.log("\nCopy the JID(s) you want to monitor and add them to your .env:");
    console.log("  WHATSAPP_GROUP_IDS=<jid1>,<jid2>\n");
  }

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Extract text from a WhatsApp message
// ---------------------------------------------------------------------------
function extractMessageText(
  msg: proto.IWebMessageInfo
): string | null {
  const m = msg.message;
  if (!m) return null;

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    null
  );
}

// ---------------------------------------------------------------------------
// Process a single message
// ---------------------------------------------------------------------------
async function processMessage(
  msg: proto.IWebMessageInfo,
  sock: WASocket
) {
  const key = msg.key;
  if (!key) return;

  const remoteJid = key.remoteJid;
  if (!remoteJid || !remoteJid.endsWith("@g.us")) return;

  if (GROUP_IDS.length > 0 && !GROUP_IDS.includes(remoteJid)) return;

  if (key.fromMe) return;

  const text = extractMessageText(msg);
  if (!text || text.length < MIN_MESSAGE_LENGTH) return;

  if (!hasJobSignal(text)) return;

  const participant = key.participant || "";
  const isRealNumber = participant.endsWith("@s.whatsapp.net");
  const senderPhone = isRealNumber
    ? participant.replace("@s.whatsapp.net", "")
    : null;
  const pushName = msg.pushName || null;

  console.log(
    `[WhatsApp] Job signal detected from ${remoteJid} (${text.length} chars)` +
      (pushName ? ` by ${pushName}` : "")
  );

  try {
    const parsed = await parseJobMessage(text);
    if (!parsed) {
      console.log(`[WhatsApp] AI rejected — not a job posting`);
      return;
    }

    const contactUrl =
      parsed.url || (senderPhone ? `https://wa.me/${senderPhone}` : null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabase() as any)
      .from("whatsapp_job_submissions")
      .insert({
        phone_number: senderPhone || pushName || participant || "unknown",
        raw_message: text.slice(0, 5000),
        parsed_title: parsed.title,
        parsed_company: parsed.company,
        parsed_location: parsed.location,
        parsed_url: contactUrl,
        parsed_description: parsed.description,
        parsed_salary: parsed.salary_range,
        parsed_tags: parsed.tags,
        status: "pending",
      });

    if (error) {
      console.error("[WhatsApp] DB insert failed:", error.message);
      return;
    }

    console.log(
      `[WhatsApp] Job captured: "${parsed.title}" at ${parsed.company}`
    );
  } catch (err) {
    console.error("[WhatsApp] Processing error:", err);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!LIST_GROUPS_MODE) {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing SUPABASE env vars. Check your .env file.");
      process.exit(1);
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY. Check your .env file.");
      process.exit(1);
    }

    if (GROUP_IDS.length === 0) {
      console.error(
        "No groups configured. Run with --list-groups to discover JIDs,\n" +
          "then set WHATSAPP_GROUP_IDS in your .env file."
      );
      process.exit(1);
    }
  }

  console.log("[WhatsApp Listener] Starting...");
  if (!LIST_GROUPS_MODE) {
    console.log(`[WhatsApp Listener] Monitoring ${GROUP_IDS.length} group(s)`);
    for (const id of GROUP_IDS) {
      console.log(`  - ${id}`);
    }
  }

  await connectWhatsApp((sock) => {
    if (LIST_GROUPS_MODE) {
      listGroups(sock);
      return;
    }

    console.log("[WhatsApp Listener] Listening for messages...\n");

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        await processMessage(msg, sock);
      }
    });
  });
}

process.on("uncaughtException", (err) => {
  console.error("[WhatsApp] Uncaught exception (process stays alive):", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("[WhatsApp] Unhandled rejection (process stays alive):", err);
});

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
