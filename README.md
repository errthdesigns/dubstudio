# DubStudio

AI-powered video dubbing application that transforms videos into any language with automatic transcription, translation, and voice synthesis.

## Features

- Upload video files (MP4, MOV, WebM)
- Automatic transcription using OpenAI Whisper
- AI dubbing with ElevenLabs
- Support for multiple languages (French, Spanish, Italian, Polish, English)
- Custom Henkel voice selection
- Side-by-side original and translated transcripts
- Download dubbed video or audio-only files

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **APIs**: ElevenLabs (dubbing & voices), OpenAI Whisper (transcription)

## Environment Variables

Create a `.env.local` file in the root directory with:

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment on Vercel

1. Push this repository to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `ELEVENLABS_API_KEY`
   - `OPENAI_API_KEY`
4. Deploy

## License

Private - Henkel Internal Use
