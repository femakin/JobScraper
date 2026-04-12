# JobScraper - Complete Setup Guide (Step by Step)

This guide walks you through every step to get the full system running:
Supabase database, OpenAI scoring, Twilio WhatsApp bot, scraper verification,
and AWS Lambda scheduling.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Step 1: Supabase Setup](#2-step-1-supabase-setup)
3. [Step 2: OpenAI API Key](#3-step-2-openai-api-key)
4. [Step 3: Twilio WhatsApp Setup](#4-step-3-twilio-whatsapp-setup)
5. [Step 4: Adzuna API (Optional)](#5-step-4-adzuna-api-optional)
6. [Step 5: Configure .env.local](#6-step-5-configure-envlocal)
7. [Step 6: Run Locally and Verify](#7-step-6-run-locally-and-verify)
8. [Step 7: Test the Scrapers](#8-step-7-test-the-scrapers)
9. [Step 8: Run a Full Scrape](#9-step-8-run-a-full-scrape)
10. [Step 9: Test WhatsApp Notifications](#10-step-9-test-whatsapp-notifications)
11. [Step 10: Deploy to AWS](#11-step-10-deploy-to-aws)
12. [Step 11: Set Up AWS Lambda Scheduler](#12-step-11-set-up-aws-lambda-scheduler)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

Make sure you have:
- **Node.js 20+** installed (`node --version`)
- **npm** installed (`npm --version`)
- An **AWS account** (all AWS steps are done in the web console, no CLI needed)
- A credit/debit card for Twilio (free trial, no charge)
- ~$5 in OpenAI credits (the whole scraping costs pennies per run)

---

## 2. Step 1: Supabase Setup

### Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `jobscraper`
   - **Database Password**: choose a strong password (save it somewhere)
   - **Region**: choose the closest to you
4. Click **"Create new project"** and wait ~2 minutes for it to initialize

### Get your API keys

1. In your Supabase dashboard, go to **Settings** (gear icon) → **API**
2. You'll see:
   - **Project URL**: copy this → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key**: copy this → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal"): copy this → this is `SUPABASE_SERVICE_ROLE_KEY`

> **WARNING**: The service_role key bypasses Row Level Security. Never expose it in client-side code or commit it to git.

### Create the database tables

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `src/lib/supabase/schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **"Run"** (or press Cmd+Enter)
6. You should see "Success. No rows returned" — this is correct

### Verify tables were created

1. Go to **Table Editor** in the left sidebar
2. You should see 4 tables:
   - `jobs`
   - `subscribers`
   - `notifications`
   - `scrape_runs`

If you see them, Supabase is ready.

---

## 3. Step 2: OpenAI API Key

1. Go to [https://platform.openai.com](https://platform.openai.com) and sign up
2. Go to **API Keys** page: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Click **"Create new secret key"**
4. Name it `jobscraper`
5. Copy the key (starts with `sk-`) → this is your `OPENAI_API_KEY`

> The key is shown only once. Save it immediately.

### Add credits

1. Go to **Settings** → **Billing**: [https://platform.openai.com/settings/organization/billing/overview](https://platform.openai.com/settings/organization/billing/overview)
2. Click **"Add payment method"** and add a card
3. Add **$5-10** of credits
4. We use `gpt-4o-mini` which costs ~$0.15 per 1M input tokens — each scrape run costs well under $0.01

---

## 4. Step 3: Twilio WhatsApp Setup

### Create a Twilio account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up
2. Verify your phone number and email
3. On the welcome screen, choose:
   - **What do you want to do?** → "Send WhatsApp messages"
   - **What language?** → "Node.js"

### Get your credentials

1. Go to the Twilio Console: [https://console.twilio.com](https://console.twilio.com)
2. On the main dashboard, you'll see:
   - **Account SID**: starts with `AC` → this is `TWILIO_ACCOUNT_SID`
   - **Auth Token**: click "Show" → this is `TWILIO_AUTH_TOKEN`

### Set up the WhatsApp Sandbox

1. In the Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Direct link: [https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. You'll see instructions like:
   ```
   Send "join <word-word>" to +1 415 523 8886 on WhatsApp
   ```
3. **Open WhatsApp on your phone** and send that exact message to the number shown
4. You'll get a reply: "You're all set! The sandbox is now active."

> The sandbox number `whatsapp:+14155238886` is already in your `.env.example`.
> After going to production, you'll buy your own Twilio WhatsApp number.

### Set the webhook URL (after deploying)

Once your app is deployed publicly, come back and:

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Scroll down to **Sandbox Configuration**
3. Set **"When a message comes in"** to:
   ```
   https://YOUR-DEPLOYED-APP.com/api/webhook/twilio
   ```
4. Method: **POST**
5. Click **Save**

> For local testing, you can use [ngrok](https://ngrok.com) to expose localhost.

---

## 5. Step 4: Adzuna API (Optional)

Adzuna adds more job sources but is optional. The other 3 scrapers work without it.

1. Go to [https://developer.adzuna.com](https://developer.adzuna.com)
2. Click **"Sign Up"** and create an account
3. After logging in, go to **Dashboard**
4. You'll see:
   - **Application ID** → this is `ADZUNA_APP_ID`
   - **Application Key** → this is `ADZUNA_APP_KEY`

---

## 6. Step 5: Configure .env.local

1. Open the file `.env.local` in the project root
2. Replace every placeholder with the real values you collected:

```bash
# Supabase (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# OpenAI (from Step 2)
OPENAI_API_KEY=sk-proj-...

# Twilio (from Step 3)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Adzuna (from Step 4 - leave empty if skipping)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# API protection key - change this to any random string
SCRAPE_API_KEY=my-super-secret-key-change-me
```

---

## 7. Step 6: Run Locally and Verify

### Start the dev server

```bash
cd jobscraper
npm install    # if you haven't already
npm run dev
```

The app will start at `http://localhost:3000`.

### Run the health check

Open a new terminal and run:

```bash
curl -s http://localhost:3000/api/health | npx json
```

Or just visit `http://localhost:3000/api/health` in your browser.

You should see something like:

```json
{
  "status": "healthy",
  "services": {
    "supabase": { "status": "ok", "message": "Connected, tables exist" },
    "openai": { "status": "ok", "message": "API key valid" },
    "twilio": { "status": "ok", "message": "Account: My Account" },
    "scrapers": {
      "remotive": { "status": "ok" },
      "remoteok": { "status": "ok" },
      "jobicy": { "status": "ok" },
      "adzuna": { "status": "not_configured" }
    }
  }
}
```

**Fix any services showing "error" before proceeding.**

### Run the full verification script

```bash
bash scripts/verify-setup.sh
```

This tests every component automatically.

---

## 8. Step 7: Test the Scrapers

Test each scraper individually (no database or AI needed):

```bash
# Test Remotive (usually has the most results)
curl -s 'http://localhost:3000/api/test-scraper?source=remotive' | npx json

# Test RemoteOK
curl -s 'http://localhost:3000/api/test-scraper?source=remoteok' | npx json

# Test Jobicy
curl -s 'http://localhost:3000/api/test-scraper?source=jobicy' | npx json

# Test Adzuna (only if configured)
curl -s 'http://localhost:3000/api/test-scraper?source=adzuna' | npx json
```

Each response shows:
- `raw_count`: total jobs from the API
- `filtered_count`: jobs matching "frontend + Nigeria-friendly"
- `jobs`: list of matching jobs with title, company, and filter results

To see ALL raw jobs before filtering (useful for debugging):

```bash
curl -s 'http://localhost:3000/api/test-scraper?source=remotive&all=true' | npx json
```

---

## 9. Step 8: Run a Full Scrape

This runs the complete pipeline: scrape → filter → deduplicate → AI score → save to DB → notify subscribers.

```bash
curl -s -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer my-super-secret-key-change-me" | npx json
```

(Replace with your actual `SCRAPE_API_KEY` value from `.env.local`)

Expected response:

```json
{
  "success": true,
  "results": [
    { "source": "remotive", "jobsFound": 50, "newJobs": 3 },
    { "source": "remoteok", "jobsFound": 200, "newJobs": 5 },
    { "source": "jobicy", "jobsFound": 20, "newJobs": 1 },
    { "source": "adzuna", "jobsFound": 0, "newJobs": 0 }
  ],
  "totalNew": 9,
  "notificationsSent": 0,
  "timestamp": "2026-04-08T..."
}
```

`notificationsSent` will be 0 until you subscribe a phone number.

### Check the dashboard

Visit `http://localhost:3000` — you should now see the scraped jobs!

### Verify in Supabase

1. Go to your Supabase dashboard → **Table Editor** → `jobs` table
2. You should see rows with titles, AI summaries, and relevance scores
3. Check `scrape_runs` table to see the run log

---

## 10. Step 9: Test WhatsApp Notifications

### Subscribe your phone number

**Option A: Via the website**

1. Go to `http://localhost:3000/subscribe`
2. Enter your name and WhatsApp number (e.g., `+2348012345678`)
3. Click "Subscribe"

**Option B: Via API**

```bash
curl -s -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+2348012345678", "name": "Your Name"}'
```

### Make sure you joined the Twilio Sandbox

If you haven't already, send `join <your-code>` to +1 415 523 8886 on WhatsApp
(see Step 3 above).

### Trigger another scrape

```bash
curl -s -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer my-super-secret-key-change-me"
```

If there are new jobs with relevance >= 60, you'll get WhatsApp messages!

> **Note**: On the first run after subscribing, there may be no *new* jobs since
> the previous run already inserted them. Wait 30+ minutes for new listings to appear
> on the job boards, or delete rows from the `jobs` table in Supabase to re-trigger.

### Test notification manually

To test WhatsApp delivery without waiting for new jobs, you can:

1. Go to Supabase → `jobs` table
2. Set `is_notified` to `false` on a few rows
3. Delete those rows' entries from the `notifications` table
4. Delete the matching `job_hash` entries so dedup treats them as new
5. Run a scrape again

---

## 11. Step 10: Deploy to AWS

### Option A: Deploy to AWS Amplify (Recommended for Next.js)

1. Push your code to a GitHub repository (don't commit `.env.local`!)

2. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify/)

3. Click **"Create new app"** then **"Host web app"**

4. Choose **GitHub** as the source, click **Connect**

5. Authorize AWS to access your GitHub, then select your repo and branch

6. On the **Build settings** screen:
   - Amplify should auto-detect **Next.js** as the framework
   - If not, set the framework to **Next.js - SSR**
   - Leave the default build command (`npm run build`) and output directory

7. Expand **"Advanced settings"** then scroll to **Environment variables**
   - Click **Add environment variable** for each one:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
   | `OPENAI_API_KEY` | `sk-...` |
   | `TWILIO_ACCOUNT_SID` | `AC...` |
   | `TWILIO_AUTH_TOKEN` | your auth token |
   | `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` |
   | `SCRAPE_API_KEY` | a random secret you make up for production |
   | `ADZUNA_APP_ID` | (leave empty if not using) |
   | `ADZUNA_APP_KEY` | (leave empty if not using) |

8. Click **"Save and deploy"**

9. Wait for the build to complete (5-10 minutes). You can watch it in the console.

10. When done, you'll get a URL like `https://main.d1234abcd.amplifyapp.com`

### Option B: Deploy to EC2 (via AWS Console)

1. Open the [EC2 Console](https://console.aws.amazon.com/ec2/)
2. Click **Launch instance**
3. Fill in:
   - **Name**: `jobscraper`
   - **AMI**: Amazon Linux 2023 (or Ubuntu 22.04)
   - **Instance type**: `t2.micro` (free tier) or `t3.small`
   - **Key pair**: Create or select one (you'll need this to SSH in)
   - **Security group**: Allow **SSH (port 22)** and **HTTP (port 80)** and **HTTPS (port 443)**
4. Click **Launch instance**
5. Once running, click on the instance, then click **Connect** > **SSH client**
6. Follow the SSH instructions shown to connect from your terminal
7. Once connected to the instance, run:
   ```bash
   # Install Node.js 20
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs git

   # Clone your repo
   git clone YOUR_REPO_URL
   cd jobscraper
   npm install

   # Set up env
   cp .env.example .env.local
   nano .env.local    # paste in your real credentials

   # Build and start
   npm run build
   npm start    # starts on port 3000
   ```
8. Set up nginx or Caddy as a reverse proxy for HTTPS on port 443

### After deploying (either option)

1. Copy your deployed URL (e.g., `https://main.d1234abcd.amplifyapp.com`)

2. Go back to **Twilio Console** > **Messaging** > **Try it out** > **Send a WhatsApp message**
   - Scroll down to **Sandbox Configuration**
   - Set **"When a message comes in"** to:
     ```
     https://YOUR-DEPLOYED-URL.com/api/webhook/twilio
     ```
   - Method: **POST**
   - Click **Save**

3. Test the deployed health endpoint by visiting this URL in your browser:
   ```
   https://YOUR-DEPLOYED-URL.com/api/health
   ```

---

## 12. Step 11: Set Up AWS Lambda Scheduler

This makes the scraper run automatically every 30 minutes. Everything below is done in the AWS web console.

### Option A: EventBridge HTTP Target (Simplest - No Lambda needed)

Use this if your app is on Amplify/EC2 and always running. No Lambda function needed at all.

1. Open the [EventBridge Console](https://console.aws.amazon.com/events/home#/rules)
2. Click **Create rule**
3. Fill in:
   - **Name**: `jobscraper-schedule`
   - **Event bus**: `default`
   - **Rule type**: select **Schedule**
4. Click **Next**
5. Select **"A schedule that runs at a regular rate"**
   - Set **Rate expression** to: `30` minutes
6. Click **Next**
7. Under **Select target**:
   - **Target type**: choose **EventBridge API destination**
   - Click **Create a new API destination**:
     - **Name**: `jobscraper-scrape`
     - **API destination endpoint**: `https://YOUR-DEPLOYED-URL.com/api/scrape`
     - **HTTP method**: `POST`
   - Click **Create a new connection**:
     - **Connection name**: `jobscraper-auth`
     - **Authorization type**: `API Key`
     - **API key name**: `Authorization`
     - **Value**: `Bearer YOUR_SCRAPE_API_KEY` (the exact value from your env)
8. Click **Next** > **Next** > **Create rule**

That's it! EventBridge will now call your scrape endpoint every 30 minutes.

### Option B: Lambda + EventBridge (Recommended)

Use this option. The Lambda function runs all 11 scrapers directly with a 5-minute timeout, bypassing the Amplify/Next.js API route timeout limits. It handles scraping, filtering, AI analysis, database storage, and WhatsApp notifications — all standalone, no dependency on your Next.js app.

#### B1. Build the ZIP file on your machine

Open a terminal in the `jobscraper` folder and run:

```bash
npm run lambda:build
npm run lambda:zip
```

This creates `lambda/dist/function.zip`. You'll upload this in the next step.

#### B2. Create an IAM Role for Lambda

1. Open the [IAM Console > Roles](https://console.aws.amazon.com/iam/home#/roles)
2. Click **Create role**
3. On the **Trusted entity type** screen:
   - Select **AWS service**
   - Under **Use case**, select **Lambda**
   - Click **Next**
4. On the **Add permissions** screen:
   - Search for `AWSLambdaBasicExecutionRole`
   - Check the checkbox next to it
   - Click **Next**
5. **Role name**: type `jobscraper-lambda-role`
6. Click **Create role**

#### B3. Create the Lambda Function

1. Open the [Lambda Console](https://console.aws.amazon.com/lambda/home#/functions)
2. Click **Create function**
3. Select **Author from scratch**
4. Fill in:
   - **Function name**: `jobscraper-scheduled`
   - **Runtime**: `Node.js 20.x`
   - **Architecture**: `x86_64`
5. Expand **Change default execution role**:
   - Select **Use an existing role**
   - Choose `jobscraper-lambda-role` from the dropdown
6. Click **Create function**

#### B4. Upload the Code

1. On the function page, scroll to the **Code source** section
2. Click **Upload from** > **.zip file**
3. Click **Upload**, pick `lambda/dist/function.zip` from your computer
4. Click **Save**
5. Scroll down to **Runtime settings**, click **Edit**
   - Set **Handler** to: `index.handler`
   - Click **Save**

#### B5. Set Timeout and Memory

1. Click the **Configuration** tab at the top
2. Click **General configuration** in the left sidebar
3. Click **Edit**
4. Set:
   - **Timeout**: `5` min `0` sec
   - **Memory**: `256` MB
5. Click **Save**

#### B6. Add Environment Variables

1. Still in the **Configuration** tab, click **Environment variables** in the left sidebar
2. Click **Edit**
3. Click **Add environment variable** and add all of these:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` (same as `.env.local`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | your Supabase service role key (same as `.env.local`) |
   | `OPENAI_API_KEY` | your OpenAI API key (same as `.env.local`) |
   | `TWILIO_ACCOUNT_SID` | your Twilio Account SID (same as `.env.local`) |
   | `TWILIO_AUTH_TOKEN` | your Twilio Auth Token (same as `.env.local`) |
   | `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (or your Twilio number) |
   | `TWILIO_WHATSAPP_JOB_CONTENT_SID` | (optional) Approved Content template `HX...` for job alerts when freeform fails with error 63016 ([Twilio template guide](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)) |
   | `TWILIO_MESSAGING_SERVICE_SID` | (optional) Messaging Service `MG...` if you send templates through a Messaging Service |
   | `ADZUNA_APP_ID` | your Adzuna App ID (optional, leave empty to skip) |
   | `ADZUNA_APP_KEY` | your Adzuna App Key (optional, leave empty to skip) |

   The Lambda runs the scraping logic directly (not via the Next.js app), so it needs all service keys.

4. Click **Save**

#### B7. Test It

1. Click the **Test** tab at the top
2. For **Event name**, type `manual-test`
3. Replace the event JSON with:
   ```json
   { "source": "manual-test" }
   ```
4. Click **Test**
5. After a few seconds, the **Execution result** panel will expand showing the scrape results
6. If you see `"success": true`, it's working

#### B8. Add the 30-Minute Schedule

1. Go back to your Lambda function's main page
2. In the **Function overview** diagram at the top, click **+ Add trigger**
3. From the dropdown, select **EventBridge (CloudWatch Events)**
4. Select **Create a new rule**
5. Fill in:
   - **Rule name**: `jobscraper-every-30min`
   - **Rule type**: select **Schedule expression**
   - **Schedule expression**: type `rate(30 minutes)`
6. Click **Add**

Done! When you add a trigger this way through the Lambda console, the permission for EventBridge to invoke the function is granted automatically. No CLI needed.

### Verify the schedule is working

1. Wait 30 minutes (or click **Test** manually on the Lambda page)
2. Click the **Monitor** tab on your Lambda function page
3. Click **View CloudWatch logs** to see the execution output
4. Go to your Supabase dashboard > **Table Editor**:
   - Check `scrape_runs` for new rows
   - Check `jobs` for newly scraped jobs
5. If you have subscribers, check WhatsApp for notifications

---

## 13. Troubleshooting

### Health check shows "error" for Supabase

- **"Tables not created yet"**: Go to Supabase SQL Editor and run `schema.sql`
- **"Invalid API key"**: Double-check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- **"Connection refused"**: Your Supabase project might be paused (free tier pauses after 7 days of inactivity). Go to the dashboard and unpause it.

### Health check shows "error" for OpenAI

- **"Incorrect API key"**: Regenerate the key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **"Insufficient quota"**: Add credits at [https://platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)

### Health check shows "error" for Twilio

- **"Authentication Error"**: Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- **"Account suspended"**: Log into Twilio console and check for any verification steps

### Scrapers return 0 filtered jobs

This is normal! The filter is strict (must be frontend AND Nigeria-friendly). Try:

```bash
# See all raw jobs before filtering
curl -s 'http://localhost:3000/api/test-scraper?source=remotive&all=true'
```

If `raw_count` is high but `filtered_count` is 0, it means no current listings
match both criteria. The scrapers are working fine — just no matching jobs right now.

### WhatsApp messages not arriving

1. **Did you join the sandbox?** Send `join <code>` to the Twilio number
2. **Is the subscriber active?** Check Supabase `subscribers` table — `is_active` should be `true`
3. **Are there jobs to notify about?** Check `jobs` table for rows with `relevance_score >= 60` and `is_notified = false`
4. **Check the notifications table**: Look at `notifications` for `status = 'failed'` entries with error messages
5. **Twilio trial limitation**: On trial, you can only send to verified numbers. Go to Twilio Console → Verified Caller IDs and add your number.
6. **Error 63016 (template required)**: WhatsApp only allows **freeform** messages within ~24 hours after the user last messaged your Twilio WhatsApp number. Subscribers who have not messaged recently need an **approved Content template**. Set `TWILIO_WHATSAPP_JOB_CONTENT_SID` (and optionally `TWILIO_MESSAGING_SERVICE_SID` if you use a Messaging Service per Twilio). Follow Twilio’s guide: [Send WhatsApp notification messages with templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates). See the README and `src/lib/twilio-job-message.ts` for the `{{1}}`–`{{6}}` variable layout.

### Lambda times out

- Go to your Lambda function > **Configuration** > **General configuration** > **Edit**
- Increase the **Timeout** to `5 min 0 sec` (300 seconds) and click **Save**
- Go to **Configuration** > **Environment variables** and make sure `APP_URL` points to your deployed app (not `localhost`)
- Test your deployed app is healthy by visiting `https://YOUR-APP/api/health` in your browser

### Lambda returns "APP_URL not configured"

- Go to your Lambda function > **Configuration** > **Environment variables** > **Edit**
- Make sure you have `APP_URL` set to your full deployed URL (e.g., `https://main.d1234abcd.amplifyapp.com`)
- Click **Save**

### Scrape API returns 401

The auth header must match your `SCRAPE_API_KEY` exactly. If testing from your browser or Postman, set the header:

```
Authorization: Bearer YOUR_EXACT_KEY_FROM_ENV
```

If testing from a terminal:

```bash
curl -X POST https://your-app/api/scrape \
  -H "Authorization: Bearer YOUR_EXACT_KEY"
```

### EventBridge rule not triggering

1. Open [EventBridge Console > Rules](https://console.aws.amazon.com/events/home#/rules)
2. Click on your rule > check that **State** is **Enabled**
3. If using the Lambda trigger approach, go to your Lambda function > **Configuration** > **Triggers** and verify the EventBridge trigger appears
4. Check **CloudWatch Logs** for your Lambda to see if it ran but failed
