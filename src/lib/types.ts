export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string;
  salary_range?: string;
  tags?: string[];
  posted_at?: string;
}

export interface Job extends ScrapedJob {
  id: string;
  scraped_at: string;
  relevance_score: number;
  ai_summary: string;
  job_hash: string;
  is_notified: boolean;
  created_at: string;
}

export interface Subscriber {
  id: string;
  phone_number: string;
  name: string;
  is_active: boolean;
  preferences: {
    keywords: string[];
    min_relevance: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  job_id: string;
  subscriber_id: string;
  sent_at: string;
  status: string;
  twilio_sid?: string;
  error_message?: string;
}

export interface ScrapeRun {
  id: string;
  source: string;
  jobs_found: number;
  new_jobs: number;
  errors?: string;
  started_at: string;
  completed_at?: string;
}

export interface AIJobAnalysis {
  relevance_score: number;
  summary: string;
  skills: string[];
}
