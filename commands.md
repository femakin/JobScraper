Important commands for all scrapers, testing, WhatsApp client, Lambda, and deployment.


1. Development

npm run dev                    # start Next.js dev server
npm run build                  # production build
npm run start                  # start production server
npm run lint                   # run ESLint


2. Testing (requires dev server running on localhost:3000)

npm run test:health            # check all services and scraper APIs
npm run test:scraper           # test a single scraper (default: remotive)
npm run test:scrape-run        # trigger a full scrape run

# test a specific scraper
curl -s 'http://localhost:3000/api/test-scraper?source=whatsapp' | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(JSON.stringify(j,null,2))})"

# list all available scrapers
curl -s 'http://localhost:3000/api/test-scraper?source=list' | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(JSON.stringify(j,null,2))})"

# preview the exact WhatsApp job alert text (no send)
curl -s -X POST 'http://localhost:3000/api/test-notification' \
  -H "Authorization: Bearer YOUR_SCRAPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"preview_only":true}'

# send a real job alert to all active subscribers (same body as production)
# uses latest job in DB; optional: {"job_id":"<uuid>","skip_mark_notified":true}
curl -s -X POST 'http://localhost:3000/api/test-notification' \
  -H "Authorization: Bearer YOUR_SCRAPE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'


3. WhatsApp Listener

# discover your group JIDs (first time only)
npm run whatsapp:groups
# → scan QR code with your phone (WhatsApp > Linked Devices)
# → copy the JID(s) for the groups you want to monitor
# → add them to .env.local: WHATSAPP_GROUP_IDS=<jid1>,<jid2>

# start the listener
npm run whatsapp:listen
# → auto-reconnects using saved session (no QR needed after first scan)
# → logs every job it captures
# → runs until Ctrl+C

# run with PM2 (production / server deployment)
pm2 start "npx tsx scripts/whatsapp-listener.ts" --name whatsapp-listener
pm2 logs whatsapp-listener     # see live output
pm2 status                     # check if running
pm2 restart whatsapp-listener  # restart
pm2 stop whatsapp-listener     # stop
pm2 startup && pm2 save        # auto-restart on server reboot


4. Lambda (AWS)

npm run lambda:build           # bundle scraper-handler.ts with esbuild
npm run lambda:zip             # zip the bundle for upload
# → upload lambda/dist/function.zip to AWS Lambda

# rebuild + zip in one go
npm run lambda:build && npm run lambda:zip


5. Database (Supabase SQL Editor)

# run src/lib/supabase/schema.sql to create all tables
# includes: jobs, subscribers, notifications, scrape_runs, whatsapp_job_submissions


6. Environment Variables (.env.local)

# required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
# Optional — WhatsApp approved template for job alerts outside 24h session (Twilio 63016)
# https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
# TWILIO_WHATSAPP_JOB_CONTENT_SID=
# TWILIO_MESSAGING_SERVICE_SID=
SCRAPE_API_KEY=

# optional
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
WHATSAPP_GROUP_IDS=