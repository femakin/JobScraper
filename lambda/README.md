# AWS Lambda Scraper

All setup is done through the AWS Console (no CLI needed).

## Option A: Lambda + EventBridge (Recommended)

### 1. Build the ZIP locally

Run these two commands on your machine:

```bash
cd jobscraper
npm run lambda:build
npm run lambda:zip
```

This creates `lambda/dist/function.zip` — you'll upload this to the console.

### 2. Create an IAM Role

1. Open [IAM Console > Roles](https://console.aws.amazon.com/iam/home#/roles)
2. Click **Create role**
3. **Trusted entity type**: select **AWS service**
4. **Use case**: select **Lambda**
5. Click **Next**
6. Search for `AWSLambdaBasicExecutionRole`, check the box
7. Click **Next**
8. **Role name**: `jobscraper-lambda-role`
9. Click **Create role**

### 3. Create the Lambda Function

1. Open [Lambda Console](https://console.aws.amazon.com/lambda/home)
2. Click **Create function**
3. Select **Author from scratch**
4. Fill in:
   - **Function name**: `jobscraper-scheduled`
   - **Runtime**: Node.js 20.x
   - **Architecture**: x86_64
   - **Execution role**: Choose **Use an existing role** > select `jobscraper-lambda-role`
5. Click **Create function**

### 4. Upload the Code

1. On your function page, scroll to the **Code source** section
2. Click **Upload from** > **.zip file**
3. Click **Upload**, select the `lambda/dist/function.zip` file from your computer
4. Click **Save**
5. In the **Runtime settings** section, click **Edit**
   - Set **Handler** to: `index.handler`
   - Click **Save**

### 5. Configure Timeout and Memory

1. Go to the **Configuration** tab
2. Click **General configuration** > **Edit**
3. Set **Timeout** to `5 min 0 sec`
4. Set **Memory** to `256 MB`
5. Click **Save**

### 6. Add Environment Variables

1. Still on the **Configuration** tab, click **Environment variables** > **Edit**
2. Click **Add environment variable** twice and fill in:
   - Key: `APP_URL` — Value: `https://your-deployed-app-url.com`
   - Key: `SCRAPE_API_KEY` — Value: your SCRAPE_API_KEY from .env.local
3. Click **Save**

### 7. Test It

1. Go to the **Test** tab
2. **Event name**: `manual-test`
3. Replace the JSON with:
   ```json
   { "source": "manual-test" }
   ```
4. Click **Test**
5. The **Execution result** panel will show your scrape results

### 8. Add EventBridge Schedule

1. On your Lambda function page, click **+ Add trigger**
2. Select **EventBridge (CloudWatch Events)**
3. Choose **Create a new rule**
4. Fill in:
   - **Rule name**: `jobscraper-every-30min`
   - **Rule type**: **Schedule expression**
   - **Schedule expression**: `rate(30 minutes)`
5. Click **Add**

That's it! The Lambda will now run every 30 minutes. EventBridge permissions are granted automatically when you add the trigger this way.

### 9. Verify It's Working

1. Go to the **Monitor** tab on your Lambda function
2. Click **View CloudWatch logs**
3. Open the latest log stream — you should see scrape results
4. Also check your Supabase `scrape_runs` and `jobs` tables for new entries

---

## Option B: EventBridge HTTP Target (No Lambda needed)

If your app is on Amplify/EC2 and always running, you can skip Lambda entirely
and have EventBridge call your API directly.

1. Open [EventBridge Console > Rules](https://console.aws.amazon.com/events/home#/rules)
2. Click **Create rule**
3. Fill in:
   - **Name**: `jobscraper-schedule`
   - **Event bus**: `default`
   - **Rule type**: **Schedule**
4. Click **Next**
5. Select **A schedule that runs at a regular rate**
   - Set to `30` minutes
6. Click **Next**
7. **Select target**:
   - Target type: **EventBridge API destination**
   - Click **Create a new API destination**:
     - **Name**: `jobscraper-scrape`
     - **API destination endpoint**: `https://YOUR-APP-URL.com/api/scrape`
     - **HTTP method**: `POST`
   - Click **Create a new connection**:
     - **Connection name**: `jobscraper-auth`
     - **Authorization type**: `API Key`
     - **API key name**: `Authorization`
     - **Value**: `Bearer YOUR_SCRAPE_API_KEY`
8. Click **Next** > **Next** > **Create rule**
