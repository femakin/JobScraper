# JobScraper - Remote Frontend Jobs for Nigerian Developers

An AI-powered job scraping webapp with WhatsApp notifications. It automatically fetches remote frontend developer jobs from 14 sources, filters them for Nigeria-friendly opportunities, scores them with OpenAI, and sends WhatsApp alerts via Twilio.

## Features

- **14-source scraping** - Remotive, RemoteOK, Jobicy, Himalayas, Working Nomads, Arc.dev, Remote.co, Jobberman, Adzuna, Moniepoint, MyJobMag, WhatsApp Groups, LinkedIn (all public APIs/pages, no login bypass)
- **5-layer filtering** - Role matching, location verification, exclusion rules, date validation, and recency check
- **AI relevance scoring** - OpenAI rates each job 0-100 for relevance to Nigerian frontend developers
- **Smart deduplication** - SHA-256 hash-based dedup prevents duplicate notifications
- **WhatsApp notifications** - Instant alerts via Twilio when high-relevance jobs are found
- **WhatsApp group listener** - Automated monitoring of WhatsApp groups for job postings via Baileys
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

## Job Sources

| Source | Type | Method |
| --- | --- | --- |
| Remotive | Remote jobs API | JSON API |
| RemoteOK | Remote jobs API | JSON API |
| Jobicy | Remote jobs API | JSON API |
| Himalayas | Remote jobs API | JSON API |
| Working Nomads | Remote jobs API | JSON API |
| Adzuna | Job search API | JSON API (requires API key) |
| Arc.dev | Remote jobs board | HTML scraping |
| Remote.co | Remote jobs board | HTML scraping |
| Jobberman | Nigeria job board | HTML scraping |
| Moniepoint | Company careers | Greenhouse API |
| MyJobMag | Nigeria job board | HTML scraping |
| LinkedIn | Professional network | Public guest API + HTML |
| WhatsApp Groups | Group messages | Baileys listener + OpenAI parsing |

## Configuration

All filters and thresholds are centralized in **one file**: `src/lib/config.ts`. Edit it to customize what jobs you want, which locations are accepted, and how scoring works. Changes apply to local dev, API routes, and Lambda (after re-deploy).

### Target Roles (`TITLE_KEYWORDS`)

Keywords that must appear in the job title for a direct match:

`frontend`, `react`, `next.js`, `nextjs`, `n8n`, `fullstack`, `full-stack`, `javascript developer`, `typescript engineer`, `ui developer`, `web engineer`, `automation engineer`, etc.

### Generic Titles (`GENERIC_TITLES`) + Tag Qualifiers (`TAG_QUALIFIERS`)

If the title is generic (e.g. "Software Engineer"), it only passes if the job's tags contain a qualifier like: `react`, `javascript`, `typescript`, `tailwind`, `vue`, `angular`, `svelte`, `n8n`, etc.

### Accepted Locations (`LOCATION_PASS`)

Location must contain one of: `worldwide`, `anywhere`, `global`, `africa`, `nigeria`, `lagos`, `emea`, `europe`, `gmt`, `utc`, etc. Bare "Remote" with no country also passes.

### Blocked Locations (`COUNTRY_BLOCKLIST`)

Rejects jobs with locations like: `united states`, `india`, `canada`, `australia`, `asia`, `apac`, `latam`, etc. (30+ countries and regions).

### Excluded Titles (`EXCLUSION_KEYWORDS`)

Rejects roles outside scope: `staff engineer`, `devops`, `data scientist`, `mobile developer`, `backend engineer`, `product manager`, `java developer`, `python engineer`, etc.

### Pipeline Thresholds (`PIPELINE_CONFIG`)

| Setting | Default | Description |
| --- | --- | --- |
| `RECENCY_HOURS` | 24 | Max job age to pass the recency filter (hours) |
| `MISSING_DATE_STRATEGY` | `"assume_recent"` | `"assume_recent"` = treat missing dates as now; `"reject"` = discard |
| `MIN_SCORE_TO_INSERT` | 40 | Min AI relevance score to save to database (0-100) |
| `MIN_SCORE_TO_NOTIFY` | 60 | Min AI relevance score to send notifications (0-100) |
| `DELAY_BETWEEN_SCRAPERS_MS` | 1000 | Rate limit between scrapers (ms) |
| `DELAY_BETWEEN_AI_BATCHES_MS` | 200 | Rate limit between OpenAI batches (ms) |
| `AI_BATCH_SIZE` | 5 | Jobs per OpenAI batch |

## Filtering Pipeline

Every scraped job passes through 5 sequential filters. A job must pass **all 5** to enter the pipeline. See `src/lib/filter.ts` for the full implementation.

### Filter 1: Role Matching (`isMatchingRole`)

The job title must match your target roles. Two paths to pass:

- **Direct match** — title contains a keyword like: `frontend`, `react`, `next.js`, `n8n`, `fullstack`, `javascript developer`, `typescript engineer`, `ui developer`, `web engineer`, `automation engineer`, etc.
- **Generic title + tag confirmation** — if the title is generic (e.g. "Software Engineer", "Developer"), the job's tags must confirm it's frontend/JS-related (e.g. tags include `react`, `javascript`, `typescript`, `tailwind`, `vue`, `angular`, `svelte`)

### Filter 2: Location — Nigeria-Friendly (`isNigeriaFriendly`)

The job must be open to applicants from Nigeria:

- **Pass signals** — location contains: `worldwide`, `anywhere`, `global`, `africa`, `nigeria`, `lagos`, `emea`, `europe`, `gmt`, `utc`, or just bare `Remote`
- **Block signals** — location mentions a specific country/region that excludes Africa: `united states`, `india`, `canada`, `australia`, `asia`, `apac`, `latam`, etc. (30+ blocked countries and regions)
- **Bare "Remote"** with no country qualifier passes (most remote boards mean worldwide)

### Filter 3: Title Exclusions (`shouldExclude`)

Rejects roles outside your scope by checking the title for:

- **Seniority**: staff engineer, principal, director, VP, head of
- **Wrong domain**: data scientist, ML engineer, DevOps, SRE, mobile developer, iOS/Android, blockchain, embedded
- **Wrong language**: Java, Python, Ruby, PHP, Go, Rust, C++, C#, .NET, Kotlin, Swift, Scala
- **Non-engineering**: product manager, project manager, marketing, sales, QA, technical writer

### Filter 4: Date Handling (`MISSING_DATE_STRATEGY`)

Controlled by `PIPELINE_CONFIG.MISSING_DATE_STRATEGY` in config:

- **`"assume_recent"`** (default) — if a job has no date, treat it as posted now. This prevents good jobs from HTML-scraped sources (Arc.dev, Remote.co, Jobberman, LinkedIn, etc.) from being discarded just because the date element wasn't found.
- **`"reject"`** — reject jobs with no date outright (strict mode).

### Filter 5: Recency (`isPostedWithinHours`)

The job must have been posted within the **last 24 hours**. Older listings are rejected to keep results fresh.

### Post-Filter Pipeline

Jobs that pass all 5 filters then go through:

1. **Deduplication** — SHA-256 hash of `title + company + url` checked against existing database entries
2. **AI Analysis** — OpenAI GPT-4o-mini scores relevance (0-100), generates a summary, and extracts skills
3. **Database Insert** — Jobs with `relevance_score >= 40` are stored in Supabase
4. **Notifications** — Jobs with `relevance_score >= 60` trigger WhatsApp alerts to all active subscribers

## Architecture

```
Job Sources (14 scrapers)
       |
       v
  Scrapers (src/lib/scrapers/)
       |
       v
  5-Layer Filter (role + location + exclusion + date + recency)
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
      health/route.ts            # Health check for all services
      test-scraper/route.ts      # Test individual scrapers
      subscribe/route.ts         # Subscription API
      webhook/twilio/route.ts    # Twilio webhook
  lib/
    supabase/
      client.ts                  # Browser Supabase client
      server.ts                  # Server Supabase client (service role)
      schema.sql                 # Full database schema
    scrapers/
      registry.ts                # Scraper registry (add new sources here)
      index.ts                   # Orchestrator
      remotive.ts                # Remotive API
      remoteok.ts                # RemoteOK API
      jobicy.ts                  # Jobicy API
      himalayas.ts               # Himalayas API
      workingnomads.ts           # Working Nomads API
      arcdev.ts                  # Arc.dev HTML
      remoteco.ts                # Remote.co HTML
      jobberman.ts               # Jobberman HTML
      adzuna.ts                  # Adzuna API
      moniepoint.ts              # Moniepoint (Greenhouse)
      myjobmag.ts                # MyJobMag HTML
      linkedin.ts                # LinkedIn public guest API
      whatsapp.ts                # WhatsApp submissions reader
    config.ts                    # Central pipeline thresholds
    openai.ts                    # AI scoring + summarization
    twilio.ts                    # WhatsApp sender
    dedup.ts                     # Hash deduplication
    filter.ts                    # 5-layer job filtering
    whatsapp-parser.ts           # OpenAI-based WhatsApp message parser
    whatsapp-client.ts           # Baileys WhatsApp connection
    types.ts                     # TypeScript interfaces
  components/
    Navbar.tsx                   # Top navigation
    JobCard.tsx                  # Job listing card
    JobList.tsx                  # Job list with pagination
    SearchFilter.tsx             # Search and filter controls
    SubscribeForm.tsx            # WhatsApp subscription form
scripts/
  whatsapp-listener.ts           # Standalone WhatsApp group monitor
lambda/
  scraper-handler.ts             # AWS Lambda entry point
```
