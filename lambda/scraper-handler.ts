/**
 * AWS Lambda handler for scheduled job scraping.
 *
 * Deployment:
 *   1. Bundle this file with its dependencies (use esbuild or similar)
 *   2. Deploy to AWS Lambda (Node.js 20.x runtime)
 *   3. Set environment variables (see .env.example)
 *   4. Create an EventBridge rule to trigger every 30 minutes:
 *      - Schedule expression: rate(30 minutes)
 *      - Target: this Lambda function
 *
 * Alternatively, you can call the Next.js API endpoint directly
 * from EventBridge using an HTTP target:
 *   POST https://your-app.com/api/scrape
 *   Authorization: Bearer <SCRAPE_API_KEY>
 */

interface LambdaEvent {
  source?: string;
  "detail-type"?: string;
}

interface LambdaResult {
  statusCode: number;
  body: string;
}

export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  const appUrl = process.env.APP_URL;
  const apiKey = process.env.SCRAPE_API_KEY;

  if (!appUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "APP_URL not configured" }),
    };
  }

  console.log("Starting scheduled scrape at", new Date().toISOString());
  console.log("Event source:", event.source || "manual");

  try {
    const response = await fetch(`${appUrl}/api/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

    const result = await response.json();

    console.log("Scrape result:", JSON.stringify(result));

    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Lambda scrape failed:", message);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
}
