# Kling AI Video Generator

A professional video generation platform powered by Kling AI with multiple model versions and credit-based system.

## Features

- Multiple Kling AI models (v2.1, v2.5 Turbo, v2.6)
- Text-to-Video and Image-to-Video generation
- Motion Control capabilities
- Credit-based pricing system
- User role management (Demo, User, Premium, Admin)
- Real-time video status tracking
- Video history with preview

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database, Auth, Storage, Edge Functions)

## Deploy to Netlify

### Prerequisites

1. A Supabase project with:
   - Database tables created (via migrations)
   - Edge functions deployed
   - Storage bucket configured
   - Authentication enabled

### Deployment Steps

#### Option 1: Deploy via Netlify UI

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to [Netlify](https://app.netlify.com/)
3. Click "Add new site" > "Import an existing project"
4. Connect your Git repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
7. Click "Deploy site"

#### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize your site:
   ```bash
   netlify init
   ```

4. Set environment variables:
   ```bash
   netlify env:set VITE_SUPABASE_URL "your_supabase_url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your_supabase_anon_key"
   ```

5. Deploy:
   ```bash
   netlify deploy --prod
   ```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with your Supabase credentials

4. Run development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Important Notes

- Supabase Edge Functions run on Supabase infrastructure, not Netlify
- Make sure all migrations are applied to your Supabase database before deploying
- Configure your Kling AI API keys in the Admin Panel after deployment
- The `netlify.toml` file is pre-configured for optimal deployment

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── kling/          # Kling model components
│   │   ├── AdminPanel.tsx  # Admin management
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── History.tsx     # Video history
│   │   └── Login.tsx       # Authentication
│   ├── lib/                # Utilities
│   │   ├── supabase.ts    # Supabase client
│   │   └── modelAccess.ts # Model access control
│   └── types.ts           # TypeScript types
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
└── netlify.toml          # Netlify configuration
```

## License

MIT
