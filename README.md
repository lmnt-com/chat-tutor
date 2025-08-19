# LMNT History Tutor Demo

This is the source code for the [LMNT History Tutor](https://lmnt-history-tutor-demo.vercel.app/) Next.js project with speech provided by [LMNT](https://lmnt.com). Fork this repo to use it as a starting point for your own project!

## Features

- **AI-Powered Conversations**: Chat with a warm, encouraging history tutor
- **Text-to-Speech**: Ultrafast and lifelike speech synthesis for responses
- **Chat History**: Save and manage your conversation threads
- **User Authentication**: Sign up and sign in to access your history
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the App

#### Option 1: Basic Mode

In this mode:

- ✅ Chat functionality works normally
- ✅ Text-to-speech works normally
- ❌ User authentication is disabled
- ❌ Chat history is not saved
- ❌ Thread management is disabled

1. Add your [LMNT API key](https://app.lmnt.com/account) and [OpenAI API key](https://platform.openai.com/account/api-keys) to a file named `.env.local` in the root of the project.

```bash
touch .env.local
```

```env
LMNT_API_KEY=your_lmnt_api_key
OPENAI_API_KEY=your_openai_api_key
```

2. Run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app in action.

#### Option 2: Persistent Mode (With Supabase)

To enable authentication and chat history persistence, you'll need to set up a database:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add your Supabase credentials to a file named `.env.local` in the root of the project:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
LMNT_API_KEY=your_lmnt_api_key
```

3. Run the SQL script in `scripts/create-tables.sql` in your Supabase SQL editor to create the necessary tables
4. Start the development server:

```bash
npm run dev
```

### Environment Variables

| Variable                        | Required | Description                                        |
| ------------------------------- | -------- | -------------------------------------------------- |
| `LMNT_API_KEY`                  | Yes      | Your LMNT API key for text-to-speech               |
| `OPENAI_API_KEY`                | Yes      | Your OpenAI API key for chat completions           |
| `NEXT_PUBLIC_SUPABASE_URL`      | No       | Supabase project URL (enables auth & history)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No       | Supabase anonymous key (enables auth & history)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | No       | Supabase service role key (enables auth & history) |

## Usage

1. **Start a Conversation**: Click on a suggested topic or type your own question
2. **Chat Naturally**: The AI tutor responds conversationally with historical insights
3. **Audio Controls**: Toggle audio on/off using the volume button
4. **Chat History**: If Supabase is configured, your conversations are automatically saved
5. **Thread Management**: View, switch between, and delete chat threads from the sidebar

## Architecture

- **Speech**: [LMNT](https://lmnt.com) for real-time text-to-speech
- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **LLM**: OpenAI GPT-4o for conversation generation
- **Database**: Supabase (PostgreSQL) for user data and chat history
- **Authentication**: Supabase Auth
- **UI Components**: Shadcn UI

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Learn More

To learn more about the technologies used:

- [LMNT API](https://docs.lmnt.com/) - learn about LMNT's text-to-speech and voice-cloning API.
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [OpenAI API](https://platform.openai.com/docs) - learn about OpenAI's chat completions API.
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features.

## Deployment

The easiest way to deploy your Next.js app is to use [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).
