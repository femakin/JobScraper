# JobScraper - Remote Frontend Jobs for Nigerian Developers

An AI-powered job scraping webapp with WhatsApp notifications. It automatically fetches remote frontend developer jobs from multiple public APIs, filters them for Nigeria-friendly opportunities, scores them with OpenAI, and sends WhatsApp alerts via Twilio.

## Features

- **Multi-source scraping** - Remotive, RemoteOK, Jobicy, Adzuna (all public APIs, no login bypass)
- **AI relevance scoring** - OpenAI rates each job 0-100 for relevance to Nigerian frontend developers
- **Smart deduplication** - SHA-256 hash-based dedup prevents duplicate notifications
- **WhatsApp notifications** - Instant alerts via Twilio when high-relevance jobs are found
- **Beautiful dashboard** - Browse, search, and filter jobs with a modern Next.js UI
- **Scheduled scraping** - AWS Lambda + EventBridge runs scrapes every 30 minutes

## Tech Stack

| Component       | Technology                    |
| --------------- | ----------------------------- |
| Frontend        | Next.js 15, Tailwind, shadcn/ui |
| Database        | Supabase (PostgreSQL)         |
| AI              | OpenAI GPT-4o-mini            |
| Notifications   | Twilio WhatsApp API           |
| Scheduling      | AWS Lambda + EventBridge      |
| Deployment      | AWS Amplify                   |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- An [OpenAI](https://platform.openai.com) API key
- A [Twilio](https://twilio.com) account with WhatsApp sandbox enabled
- (Optional) [Adzuna](https://developer.adzuna.com) API credentials

### 1. Clone and install

```bash
cd jobscraper
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Fill in all the values in `.env.local` (see comments in the file for where to get each key).

### 3. Set up Supabase database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `src/lib/supabase/schema.sql`
4. Run the SQL to create all tables, indexes, and policies

### 4. Set up Twilio WhatsApp Sandbox

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging > Try it out > Send a WhatsApp message**
3. Follow the instructions to join the sandbox (send "join <your-code>" from your WhatsApp)
4. Set the webhook URL to `https://your-app.com/api/webhook/twilio` (POST)
5. Copy your Account SID and Auth Token to `.env.local`

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### 6. Trigger a scrape

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Authorization: Bearer your-random-secret-key-here"
```

## API Endpoints

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/jobs`          | List jobs with search/filter/pagination |
| POST   | `/api/scrape`        | Trigger a scrape run (auth required) |
| POST   | `/api/subscribe`     | Subscribe a phone number for alerts  |
| POST   | `/api/webhook/twilio`| Twilio incoming message webhook      |

### Query parameters for `/api/jobs`

| Param      | Type   | Description               |
| ---------- | ------ | ------------------------- |
| page       | number | Page number (default: 1)  |
| limit      | number | Results per page (max 50) |
| search     | string | Search in title/company/summary |
| source     | string | Filter by source          |
| min_score  | number | Minimum relevance score   |

## Scheduled Scraping (AWS)

See [`lambda/README.md`](lambda/README.md) for detailed setup instructions. Two options:

1. **Lambda + EventBridge**: Deploy the bundled Lambda handler, create an EventBridge rule with `rate(30 minutes)`
2. **EventBridge HTTP target**: Skip Lambda and have EventBridge call your `/api/scrape` endpoint directly

## Architecture

```
Job APIs (Remotive, RemoteOK, Jobicy, Adzuna)
       |
       v
  API Fetchers (src/lib/scrapers/)
       |
       v
  Keyword Filter (Nigeria + Frontend)
       |
       v
  Hash Deduplication (SHA-256)
       |
       v
  OpenAI Analysis (relevance score + summary)
       |
       v
  Supabase (store jobs with score >= 40)
       |
       v
  Twilio WhatsApp (notify subscribers for score >= 60)
```

## Project Structure

```
src/
  app/
    page.tsx                     # Dashboard
    layout.tsx                   # Root layout with navbar
    jobs/[id]/page.tsx           # Job detail page
    subscribe/page.tsx           # WhatsApp subscription page
    api/
      scrape/route.ts            # Scrape trigger endpoint
      jobs/route.ts              # Jobs listing API
      subscribe/route.ts         # Subscription API
      webhook/twilio/route.ts    # Twilio webhook
  lib/
    supabase/
      client.ts                  # Browser Supabase client
      server.ts                  # Server Supabase client (service role)
      schema.sql                 # Full database schema
    scrapers/
      index.ts                   # Orchestrator
      remotive.ts                # Remotive API
      remoteok.ts                # RemoteOK API
      jobicy.ts                  # Jobicy API
      adzuna.ts                  # Adzuna API
    openai.ts                    # AI scoring + summarization
    twilio.ts                    # WhatsApp sender
    dedup.ts                     # Hash deduplication
    filter.ts                    # Job filtering
    types.ts                     # TypeScript interfaces
  components/
    Navbar.tsx                   # Top navigation
    JobCard.tsx                  # Job listing card
    JobList.tsx                  # Job list with pagination
    SearchFilter.tsx             # Search and filter controls
    SubscribeForm.tsx            # WhatsApp subscription form
lambda/
  scraper-handler.ts             # AWS Lambda entry point
```
