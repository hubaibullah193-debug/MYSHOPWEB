# Hubaib One Stop Shop

A modern e-commerce platform for Hubaib One Stop Shop, built with Next.js, React, TypeScript, and Supabase.

## Features

- **Multiple Order Channels**: Website, WhatsApp, phone
- **Real-time Inventory**: Track stock across all channels
- **Role-based Admin**: Owner, Super Admin, Admin Staff with granular permissions
- **Bilingual UI**: English and Urdu with RTL support
- **Manual Order Fulfillment**: Admin assigns delivery method, date, and time
- **Payment Verification**: COD, JazzCash, Easypaisa with manual confirmation
- **Activity Logging**: Complete audit trail of all admin actions
- **Guest Checkout**: Optional customer accounts

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel
- **Styling**: TailwindCSS with RTL support
- **i18n**: next-i18n-router + react-i18next

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### Installation

1. Clone the repository
2. Create `.env.local` from `.env.example`
3. Add your Supabase credentials
4. Install dependencies:

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Testing

```bash
npm test
npm run test:watch
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages and layouts
├── components/       # React components
├── lib/              # Utility functions, Supabase client, helpers
├── types/            # TypeScript type definitions
├── styles/           # Global styles
└── hooks/            # Custom React hooks
```

## Documentation

- [spec.md](docs/spec.md) — Complete specification and business logic
- [CLAUDE.md](CLAUDE.md) — Project constitution for AI assistants
- [AGENTS.md](AGENTS.md) — Agent rules and guidelines
- [tasks.md](docs/tasks.md) — Implementation checklist
- [remaining-tasks.md](docs/remaining-tasks.md) — Master execution roadmap

## License

MIT
