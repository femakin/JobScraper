#!/bin/bash
# =============================================================
# JobScraper Setup Verification Script
# Run this after setting up your .env.local to check everything
# Usage: bash scripts/verify-setup.sh
# =============================================================

BASE_URL="${1:-http://localhost:3000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  JobScraper Setup Verification"
echo "=========================================="
echo "  Target: $BASE_URL"
echo "=========================================="
echo ""

# -------------------------------------------
# Step 1: Check if the app is running
# -------------------------------------------
echo -e "${BLUE}[1/6] Checking if app is running...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ App is running at $BASE_URL${NC}"
else
    echo -e "${RED}  ✗ App not reachable (HTTP $HTTP_CODE). Start with: npm run dev${NC}"
    exit 1
fi
echo ""

# -------------------------------------------
# Step 2: Health check (all services)
# -------------------------------------------
echo -e "${BLUE}[2/6] Running health check...${NC}"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | node -e "
  process.stdin.on('data', d => {
    try {
      const h = JSON.parse(d);
      console.log('  Overall:', h.status);
      console.log('');
      const s = h.services;
      const icon = (status) => status === 'ok' ? '✓' : status === 'not_configured' ? '⚠' : '✗';
      const color = (status) => status === 'ok' ? '\x1b[32m' : status === 'not_configured' ? '\x1b[33m' : '\x1b[31m';
      console.log(color(s.supabase.status) + '  ' + icon(s.supabase.status) + ' Supabase: ' + s.supabase.message + '\x1b[0m');
      console.log(color(s.openai.status) + '  ' + icon(s.openai.status) + ' OpenAI: ' + s.openai.message + '\x1b[0m');
      console.log(color(s.twilio.status) + '  ' + icon(s.twilio.status) + ' Twilio: ' + s.twilio.message + '\x1b[0m');
      console.log('');
      console.log('  Scraper APIs:');
      for (const [name, info] of Object.entries(s.scrapers)) {
        console.log(color(info.status) + '    ' + icon(info.status) + ' ' + name + ': ' + info.message + (info.latency_ms ? ' (' + info.latency_ms + 'ms)' : '') + '\x1b[0m');
      }
    } catch(e) { console.log('  Failed to parse health response'); }
  });
"
echo ""

# -------------------------------------------
# Step 3: Test a scraper (Remotive - no auth needed)
# -------------------------------------------
echo -e "${BLUE}[3/6] Testing Remotive scraper...${NC}"
SCRAPER=$(curl -s "$BASE_URL/api/test-scraper?source=remotive")
echo "$SCRAPER" | node -e "
  process.stdin.on('data', d => {
    try {
      const s = JSON.parse(d);
      if (s.error) {
        console.log('\x1b[31m  ✗ ' + s.error + ': ' + (s.message || '') + '\x1b[0m');
      } else {
        console.log('\x1b[32m  ✓ Fetched ' + s.raw_count + ' raw jobs, ' + s.filtered_count + ' match filters (in ' + s.scrape_time_ms + 'ms)\x1b[0m');
        if (s.jobs.length > 0) {
          console.log('  Sample: \"' + s.jobs[0].title + '\" at ' + s.jobs[0].company);
        }
      }
    } catch(e) { console.log('  Failed to parse scraper response'); }
  });
"
echo ""

# -------------------------------------------
# Step 4: Test RemoteOK scraper
# -------------------------------------------
echo -e "${BLUE}[4/6] Testing RemoteOK scraper...${NC}"
SCRAPER2=$(curl -s "$BASE_URL/api/test-scraper?source=remoteok")
echo "$SCRAPER2" | node -e "
  process.stdin.on('data', d => {
    try {
      const s = JSON.parse(d);
      if (s.error) {
        console.log('\x1b[31m  ✗ ' + s.error + ': ' + (s.message || '') + '\x1b[0m');
      } else {
        console.log('\x1b[32m  ✓ Fetched ' + s.raw_count + ' raw jobs, ' + s.filtered_count + ' match filters (in ' + s.scrape_time_ms + 'ms)\x1b[0m');
      }
    } catch(e) { console.log('  Failed to parse scraper response'); }
  });
"
echo ""

# -------------------------------------------
# Step 5: Test Jobicy scraper
# -------------------------------------------
echo -e "${BLUE}[5/6] Testing Jobicy scraper...${NC}"
SCRAPER3=$(curl -s "$BASE_URL/api/test-scraper?source=jobicy")
echo "$SCRAPER3" | node -e "
  process.stdin.on('data', d => {
    try {
      const s = JSON.parse(d);
      if (s.error) {
        console.log('\x1b[31m  ✗ ' + s.error + ': ' + (s.message || '') + '\x1b[0m');
      } else {
        console.log('\x1b[32m  ✓ Fetched ' + s.raw_count + ' raw jobs, ' + s.filtered_count + ' match filters (in ' + s.scrape_time_ms + 'ms)\x1b[0m');
      }
    } catch(e) { console.log('  Failed to parse scraper response'); }
  });
"
echo ""

# -------------------------------------------
# Step 6: Summary
# -------------------------------------------
echo -e "${BLUE}[6/6] Next steps...${NC}"
echo ""
echo "  If all checks pass, you can run a full scrape:"
echo "    curl -X POST $BASE_URL/api/scrape -H 'Authorization: Bearer dev-secret-key'"
echo ""
echo "  Then visit the dashboard at: $BASE_URL"
echo ""
echo "=========================================="
echo "  Verification complete!"
echo "=========================================="
echo ""
