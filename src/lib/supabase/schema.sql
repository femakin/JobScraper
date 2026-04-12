-- JobScraper Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table: stores all scraped job listings
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  url TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  salary_range TEXT,
  tags TEXT[] DEFAULT '{}',
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  relevance_score INTEGER DEFAULT 0,
  ai_summary TEXT,
  job_hash TEXT UNIQUE NOT NULL,
  is_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers table: WhatsApp notification recipients
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{"keywords": ["frontend", "react", "nextjs", "javascript", "typescript"], "min_relevance": 60}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table: log of sent WhatsApp messages
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  twilio_sid TEXT,
  error_message TEXT
);

-- Scrape runs table: audit log of scrape executions
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  jobs_found INTEGER DEFAULT 0,
  new_jobs INTEGER DEFAULT 0,
  errors TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- WhatsApp job submissions: staging table for forwarded job posts
CREATE TABLE IF NOT EXISTS whatsapp_job_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  parsed_title TEXT,
  parsed_company TEXT,
  parsed_location TEXT,
  parsed_url TEXT,
  parsed_description TEXT,
  parsed_salary TEXT,
  parsed_tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_hash ON jobs(job_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_relevance ON jobs(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_notified ON jobs(is_notified);
CREATE INDEX IF NOT EXISTS idx_jobs_scraped ON jobs(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscribers_phone ON subscribers(phone_number);
CREATE INDEX IF NOT EXISTS idx_notifications_job ON notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_notifications_subscriber ON notifications(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_wa_submissions_status ON whatsapp_job_submissions(status);
CREATE INDEX IF NOT EXISTS idx_wa_submissions_created ON whatsapp_job_submissions(created_at DESC);

-- Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_job_submissions ENABLE ROW LEVEL SECURITY;

-- Public read access for jobs (anyone can view)
CREATE POLICY "Jobs are publicly readable"
  ON jobs FOR SELECT
  USING (true);

-- Service role can do everything on all tables
CREATE POLICY "Service role full access on jobs"
  ON jobs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on subscribers"
  ON subscribers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on notifications"
  ON notifications FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on scrape_runs"
  ON scrape_runs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on whatsapp_job_submissions"
  ON whatsapp_job_submissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Telegram (optional): link bot + store chat_id per subscriber (safe to re-run)
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS telegram_link_token TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS telegram_link_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_telegram_chat_id
  ON subscribers(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_telegram_link_token
  ON subscribers(telegram_link_token) WHERE telegram_link_token IS NOT NULL;
