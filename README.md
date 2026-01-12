# NeuroData Hub

An open neuroscience data marketplace that aggregates studies from OpenNeuro, Allen Brain Atlas, and Human Connectome Project. Built with Next.js, Supabase, and AI-powered data enrichment.

## 🧠 Features

- **Neuroscience Data**: Access 15K+ studies, 1M+ brain regions, 500TB+ of imaging data
- **Multiple Sources**: OpenNeuro (CC0), Allen Brain Atlas, Human Connectome Project
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI Integration**: Google Gemini API for data enrichment and analysis
- **Faceted Search**: Filter by modality, brain region, demographics, conditions
- **Brain Atlas**: Interactive hierarchical brain region explorer
- **Responsive UI**: Mobile-first design with dark theme

## 📁 Project Structure

```
├── scripts/                # Data sync scripts
│   ├── sync-openneuro.ts  # OpenNeuro GraphQL sync
│   ├── sync-allen.ts      # Allen Brain Atlas sync
│   ├── sync-hcp.ts        # Human Connectome Project sync
│   └── upload-to-supabase.ts # Upload to database
├── app/                    # Next.js app router
│   ├── dashboard/         # Main dashboard pages
│   │   ├── studies/       # Studies explorer
│   │   ├── datasets/      # Datasets browser
│   │   ├── regions/       # Brain atlas
│   │   └── sources/       # Data sources
│   ├── login/             # Auth pages
│   └── page.tsx           # Landing page
├── components/             # React components
│   ├── ui/                # UI components
│   └── layout/            # Layout components
├── contexts/               # React contexts
├── lib/                    # Utilities
│   └── supabase.ts        # Supabase client
├── types/                  # TypeScript types
└── database/              # SQL schemas
    └── neuro-schema.sql   # Neuroscience database schema
```

## 🛠 Setup

### 1. Clone and Install

```bash
cd neurodata-hub
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for agents)
- `GEMINI_API_KEY` - Your Google Gemini API key

### 3. Database Setup

Run the schema in your Supabase SQL editor:

```bash
# Copy contents of database/schema.sql and run in Supabase
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Run Agents (Optional)

```bash
# Run all agents
npm run agent

# Run specific agents
npm run agent:fetch
npm run agent:enrich
npm run agent:quality
```

## 🎯 Customization

### Changing the Data Domain

1. Update `types/index.ts` with your data types
2. Modify `database/schema.sql` for your schema
3. Update API routes in `app/api/`
4. Customize agents in `agents/`

### Adding New Data Sources

1. Add fetch logic to `agents/data-fetcher.ts`
2. Configure source in `lib/data-sources.ts`
3. Set up cron job or manual trigger

### Theming

Edit `app/globals.css` to change colors:
- Primary color: `--primary`
- Background: `--background`
- Text: `--foreground`

## 📊 Agent System

The agent system is designed for continuous data growth:

1. **Data Fetcher**: Pulls data from APIs, web scraping, or file imports
2. **Data Enricher**: Uses AI to add metadata, descriptions, and insights
3. **Quality Checker**: Validates data integrity and flags issues

Agents can be run on a schedule (cron) or triggered manually.

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Service role key only used in server-side agents
- User data isolated by `user_id`

## 📝 License

MIT
