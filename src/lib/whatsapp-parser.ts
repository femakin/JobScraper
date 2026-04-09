import OpenAI from "openai";

export interface ParsedWhatsAppJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  salary_range?: string;
  tags: string[];
}

let _openai: OpenAI;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function parseJobMessage(
  rawMessage: string
): Promise<ParsedWhatsAppJob | null> {
  const prompt = `Extract job posting details from this WhatsApp message. The message may be a forwarded job listing, a link with description, or raw job details.

Message:
${rawMessage.slice(0, 3000)}

Extract and respond in JSON with:
1. "title": Job title (e.g. "Senior Frontend Engineer"). Best guess if unclear.
2. "company": Company name. "Unknown" if not mentioned.
3. "location": Job location (e.g. "Remote", "Lagos, Nigeria"). Default "Remote" if not specified.
4. "url": Application URL or link. Empty string if none found.
5. "description": Clean summary of job requirements and responsibilities (max 500 chars).
6. "salary_range": Salary if mentioned, otherwise null.
7. "tags": Array of technical skills/keywords mentioned (max 8).
8. "is_job": true if this message contains a job posting, false if it's random text.

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!parsed.is_job) return null;

    return {
      title: parsed.title || "Untitled Position",
      company: parsed.company || "Unknown",
      location: parsed.location || "Remote",
      url: parsed.url || "",
      description: parsed.description || rawMessage.slice(0, 500),
      salary_range: parsed.salary_range || undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
    };
  } catch (error) {
    console.error("WhatsApp job parsing failed:", error);
    return null;
  }
}
