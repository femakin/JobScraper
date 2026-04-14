import type { ScrapedJob } from "../types";
import { scrapeRemotive } from "./remotive";
import { scrapeRemoteOK } from "./remoteok";
import { scrapeJobicy } from "./jobicy";
import { scrapeAdzuna } from "./adzuna";
import { scrapeHimalayas } from "./himalayas";
import { scrapeWorkingnomads } from "./workingnomads";
import { scrapeArcdev } from "./arcdev";
import { scrapeRemoteco } from "./remoteco";
import { scrapeJobberman } from "./jobberman";
import { scrapeMoniepoint } from "./moniepoint";
import { scrapeMyJobMag } from "./myjobmag";
import { scrapeWhatsApp } from "./whatsapp";
import { scrapeLinkedIn } from "./linkedin";
import { scrapeJobsInNigeria } from "./jobsinnigeria";
import { scrapeWeWorkRemotely } from "./weworkremotely";

// ---------------------------------------------------------------------------
// Scraper Registry
//
// To add a new job source:
//   1. Create a new file in src/lib/scrapers/ (e.g. mynewsite.ts)
//   2. Export a function: export async function scrapeMyNewSite(): Promise<ScrapedJob[]>
//   3. Import it above
//   4. Add an entry to the SCRAPERS array below
//
// That's it. The orchestrator, test endpoint, and health check will all
// pick it up automatically.
// ---------------------------------------------------------------------------

export interface ScraperConfig {
  /** Unique ID used in the database, API, and UI */
  id: string;
  /** Human-readable name */
  name: string;
  /** The website being scraped */
  website: string;
  /** The function that fetches jobs from this source */
  scrape: () => Promise<ScrapedJob[]>;
  /** Is this source enabled? Set to false to temporarily disable */
  enabled: boolean;
  /** Skip keyword/location/recency filtering (for human-curated sources) */
  skipFilter?: boolean;
}

export const SCRAPERS: ScraperConfig[] = [
  {
    id: "remotive",
    name: "Remotive",
    website: "https://remotive.com",
    scrape: scrapeRemotive,
    enabled: true,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    website: "https://remoteok.com",
    scrape: scrapeRemoteOK,
    enabled: true,
  },
  {
    id: "jobicy",
    name: "Jobicy",
    website: "https://jobicy.com",
    scrape: scrapeJobicy,
    enabled: true,
  },
  {
    id: "himalayas",
    name: "Himalayas",
    website: "https://himalayas.app",
    scrape: scrapeHimalayas,
    enabled: true,
  },
  {
    id: "workingnomads",
    name: "Working Nomads",
    website: "https://workingnomads.com",
    scrape: scrapeWorkingnomads,
    enabled: true,
  },
  {
    id: "arcdev",
    name: "Arc.dev",
    website: "https://arc.dev",
    scrape: scrapeArcdev,
    enabled: true,
  },
  {
    id: "remoteco",
    name: "Remote.co",
    website: "https://remote.co",
    scrape: scrapeRemoteco,
    enabled: true,
  },
  {
    id: "jobberman",
    name: "Jobberman",
    website: "https://jobberman.com",
    scrape: scrapeJobberman,
    enabled: true,
  },
  {
    id: "adzuna",
    name: "Adzuna",
    website: "https://adzuna.com",
    scrape: scrapeAdzuna,
    enabled: true, // gracefully skips if API keys aren't set
  },
  {
    id: "moniepoint",
    name: "Moniepoint",
    website: "https://moniepoint.com",
    scrape: scrapeMoniepoint,
    enabled: true,
  },
  {
    id: "myjobmag",
    name: "MyJobMag",
    website: "https://myjobmag.com",
    scrape: scrapeMyJobMag,
    enabled: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Groups",
    website: "https://wa.me",
    scrape: scrapeWhatsApp,
    enabled: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    website: "https://linkedin.com",
    scrape: scrapeLinkedIn,
    enabled: true,
  },
  {
    id: "jobsinnigeria",
    name: "Jobs in Nigeria",
    website: "https://jobsinnigeria.careers",
    scrape: scrapeJobsInNigeria,
    enabled: true,
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    website: "https://weworkremotely.com",
    scrape: scrapeWeWorkRemotely,
    enabled: true,
  },
];

export function getEnabledScrapers(): ScraperConfig[] {
  return SCRAPERS.filter((s) => s.enabled);
}

export function getScraperById(id: string): ScraperConfig | undefined {
  return SCRAPERS.find((s) => s.id === id);
}

export function getAllScraperIds(): string[] {
  return SCRAPERS.map((s) => s.id);
}
