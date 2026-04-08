import OpenAI from "openai";
import type { ScrapedJob, AIJobAnalysis } from "./types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function analyzeJob(job: ScrapedJob): Promise<AIJobAnalysis> {
  const cleanDescription = stripHtml(job.description || "").slice(0, 2000);

  const prompt = `Analyze this job posting for a developer based in Lagos, Nigeria with the following profile:
- Frontend Developer / Engineer (React, Next.js, JavaScript, TypeScript)
- n8n Automation / Workflow Automation Engineer
- Full-stack JavaScript/Node.js capabilities
- Looking for remote roles that hire from Nigeria, Africa, EMEA, or worldwide

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${cleanDescription}

Respond in JSON with:
1. "relevance_score": 0-100 integer. Score based on:
   - Is it a frontend, JavaScript, React, Next.js, automation, or full-stack web role? (0 if completely unrelated like DevOps-only, data science, mobile-only)
   - Does it explicitly accept remote workers from Nigeria/Africa/EMEA/worldwide? (much higher if yes, lower if US-only or EU-only)
   - Seniority: junior, mid, or senior are fine. Staff/principal/VP/director score lower.
   - Quality: reputable company, clear salary, growth opportunity score higher
2. "summary": A concise 2-sentence summary highlighting the role and key requirements
3. "skills": Array of key technical skills mentioned (max 8)

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { relevance_score: 0, summary: "", skills: [] };
    }

    const parsed = JSON.parse(content);
    return {
      relevance_score: Math.min(100, Math.max(0, parsed.relevance_score || 0)),
      summary: parsed.summary || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8) : [],
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return { relevance_score: 50, summary: "Analysis unavailable.", skills: [] };
  }
}

export async function analyzeJobsBatch(
  jobs: ScrapedJob[]
): Promise<Map<ScrapedJob, AIJobAnalysis>> {
  const results = new Map<ScrapedJob, AIJobAnalysis>();
  const batchSize = 5;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const analyses = await Promise.all(batch.map(analyzeJob));

    batch.forEach((job, index) => {
      results.set(job, analyses[index]);
    });

    if (i + batchSize < jobs.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
