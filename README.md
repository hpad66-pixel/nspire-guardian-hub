# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## ElevenLabs Voice Agent (Edge Function Secrets)

The voice agent uses a Supabase Edge Function to obtain a signed ElevenLabs conversation URL.  
Set these secrets in Supabase (do not hard-code in the repo):

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`

These are read by `supabase/functions/voice-agent-token/index.ts`.

## App-Owned Email Inbox (Thread Alias + Inbound Webhook)

External email threading now uses a per-thread reply alias format:
`thread+<thread_uuid>@<your-reply-domain>`.

Implemented in:
- `supabase/functions/send-email/index.ts`
- `supabase/functions/send-report-email/index.ts`
- `supabase/functions/inbound-email-webhook/index.ts`

Set these Supabase function secrets:
- `INBOUND_REPLY_DOMAIN` (example: `mail.yourdomain.com`)
- `INBOUND_WEBHOOK_SECRET` (required by inbound webhook)
- `INBOUND_FORWARD_TO_USER` (`true` to forward inbound copies to user email)
- `RESEND_API_KEY` (already used for outbound and optional forwarding)

Webhook endpoint:
- `POST /functions/v1/inbound-email-webhook`
- Send `x-inbound-webhook-secret: <INBOUND_WEBHOOK_SECRET>` (or `Authorization: Bearer <secret>`)

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Cloudflare Pages

Use these settings in Cloudflare Pages:

- Framework preset: `Vite`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: `/` (repo root)
- Node.js version: `20`

Environment variables required in Cloudflare Pages:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_VAPID_PUBLIC_KEY` (if push notifications are enabled)

Notes:

- SPA fallback is already handled by `public/_redirects`.
- `wrangler.toml` is included for `wrangler pages deploy` workflows.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
