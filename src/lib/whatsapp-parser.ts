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
  const prompt = `You are a strict job posting classifier. Determine if this WhatsApp message is an ACTUAL JOB VACANCY — someone actively hiring or advertising an open position.

A message IS a job posting ONLY if it has CLEAR HIRING INTENT, such as:
- "We are hiring...", "Looking for a [role] to join...", "Open position for..."
- A company posting a role with requirements, responsibilities, or salary
- A forwarded job listing with title, company, and how to apply
- "Send your CV/resume to...", "Apply at..."

A message is NOT a job posting if it is:
- Someone asking a technical question ("How do I...", "Has anyone implemented...")
- Someone looking FOR a job ("I am a developer looking for...")
- General discussion, opinions, or advice about tech/work
- Casual conversation mentioning tech terms
- Someone asking for help or recommendations
- Gossip or stories about companies/salaries without actual openings

Be VERY strict. When in doubt, set is_job to false. Most group messages are conversation, not job ads.

Message:
${rawMessage.slice(0, 3000)}

Respond in JSON:
1. "is_job": true ONLY if this is a genuine job vacancy/hiring post. false for everything else.
2. "title": Job title if is_job is true, otherwise empty string.
3. "company": Company name. Empty string if not mentioned or is_job is false.
4. "location": Job location. Empty string if not specified or is_job is false.
5. "url": Application URL or link. Empty string if none found.
6. "description": Summary of requirements and responsibilities (max 500 chars). Empty if is_job is false.
7. "salary_range": Salary if mentioned, otherwise null.
8. "tags": Array of technical skills mentioned (max 8). Empty array if is_job is false.

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
