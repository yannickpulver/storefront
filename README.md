# Store Helper

Dashboard for viewing reviews, releases, and release statuses across Google Play Store and Apple App Store.

## Setup

```bash
npm install
cp .env.example .env.local
```

### Google Play Store Credentials

1. Create a Google Cloud project and enable the **Google Play Android Developer API**
2. Create a **Service Account** with access to your Google Play Console
3. Download the JSON key file
4. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the contents of the JSON file

### Apple App Store Connect Credentials

1. Go to [App Store Connect > Users and Access > Integrations > Individual Keys](https://appstoreconnect.apple.com/access/integrations/api)
2. Generate an API key with **App Manager** or **Admin** role
3. Set the following env vars:
   - `APPLE_ISSUER_ID` — your Issuer ID (shown at top of keys page)
   - `APPLE_KEY_ID` — the Key ID of your generated key
   - `APPLE_PRIVATE_KEY` — contents of the downloaded `.p8` file

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Set the environment variables in Vercel project settings, then deploy.
