# AI Business Rescue

AI-powered business management workspace for local businesses.

## MVP modules
- Secure authentication (Supabase)
- Business dashboard
- Customer and lead CRM
- Follow-up tracking
- Quotation builder
- Reports and business settings

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL with Row Level Security
- OpenAI API (server-side only; optional until configured)

## Local setup
1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in Supabase credentials.
4. Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.
5. Run `npm run dev`.

## Environment variables
See `.env.example`. Never expose service-role or OpenAI secrets in browser code.

## Status
MVP foundation in active development. Integrations such as WhatsApp and payments are not connected yet.
