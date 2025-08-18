# CreatiFit AI

AI-powered fitness plan generator and workout tracker built with Next.js, Prisma, and OpenAI.

## Features

- 🤖 **AI-Generated Plans**: Personalized workout plans based on your goals, level, and equipment
- 📱 **Mobile-First Design**: Optimized for both web and mobile devices
- 📊 **Progress Tracking**: Log your workouts and track your progress over time
- 🎯 **Customizable Goals**: Support for fat loss, muscle gain, strength, endurance, and general fitness
- 🔄 **Plan Management**: Generate, edit, and regenerate workout plans

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT-4 with Structured Outputs
- **Authentication**: Supabase Auth
- **State Management**: TanStack Query

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd creatifit-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:
```env
# Core
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
MODEL_NAME=gpt-4o-mini

# Database — Supabase (recommended for MVP)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
DATABASE_URL=your-supabase-database-url-here
```

4. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with initial data
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/            # Protected app routes
│   │   ├── dashboard/    # User dashboard
│   │   ├── plan/         # Plan management
│   │   ├── session/      # Workout sessions
│   │   └── onboarding/   # User onboarding
│   ├── (marketing)/      # Public marketing pages
│   └── api/              # API routes
│       ├── plan/         # Plan generation and management
│       ├── logs/         # Workout logging
│       └── exercise/     # Exercise information
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── forms/            # Form components
└── lib/                  # Utility libraries
    ├── ai/               # OpenAI integration
    ├── auth/             # Authentication
    ├── db/               # Database utilities
    └── validators/       # Zod schemas
```

## API Endpoints

### Plan Generation
- `POST /api/plan/generate` - Generate a new fitness plan
- `GET /api/plan/[id]` - Get plan details

### Workout Logging
- `POST /api/logs` - Log a workout set
- `GET /api/logs` - Get workout history

### Exercise Management
- `GET /api/exercise/[id]` - Get exercise details

## Database Schema

The application uses the following main models:
- `profiles` - User profiles
- `intake` - User fitness questionnaire
- `plans` - Generated workout plans
- `plan_days` - Individual workout days
- `exercises` - Exercise library
- `day_exercises` - Exercises for specific days
- `workout_logs` - Workout tracking data

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

### Adding New Features

1. **New API Routes**: Add under `src/app/api/`
2. **New Components**: Add under `src/components/`
3. **New Pages**: Add under `src/app/`
4. **Database Changes**: Update `prisma/schema.prisma` and run `npm run db:push`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all required environment variables in your production environment:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.