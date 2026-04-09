import { supabaseAdmin } from "../supabase/server";
import type { ScrapedJob } from "../types";

interface WhatsAppSubmission {
  id: string;
  parsed_title: string | null;
  parsed_company: string | null;
  parsed_location: string | null;
  parsed_url: string | null;
  parsed_description: string | null;
  parsed_salary: string | null;
  parsed_tags: string[] | null;
  raw_message: string;
  created_at: string;
}

export async function scrapeWhatsApp(): Promise<ScrapedJob[]> {
  const { data: submissions, error } = await supabaseAdmin
    .from("whatsapp_job_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Failed to read WhatsApp submissions:", error.message);
    return [];
  }

  if (!submissions?.length) return [];

  const jobs: ScrapedJob[] = [];
  const processedIds: string[] = [];

  for (const sub of submissions as WhatsAppSubmission[]) {
    if (!sub.parsed_title) continue;

    jobs.push({
      title: sub.parsed_title,
      company: sub.parsed_company || "Unknown",
      location: sub.parsed_location || "Remote",
      url: sub.parsed_url || "",
      description:
        sub.parsed_description || sub.raw_message?.slice(0, 2000) || "",
      source: "whatsapp",
      salary_range: sub.parsed_salary || undefined,
      tags: sub.parsed_tags || [],
      posted_at: sub.created_at,
    });

    processedIds.push(sub.id);
  }

  if (processedIds.length > 0) {
    await supabaseAdmin
      .from("whatsapp_job_submissions")
      .update({ status: "processed" })
      .in("id", processedIds);
  }

  return jobs;
}
