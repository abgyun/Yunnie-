# DM Besties

A polished fake social-media experience for Yun: Instagram-style DMs with Yui, Mia, and June plus an X/Twitter-style Seoul feed.

## Stack
- React + TypeScript + Vite
- Tailwind CSS v4
- Express server
- Gemini API from the server only
- Open-Meteo for Seoul weather, cached for 30 minutes in the server
- Browser `localStorage` persistence for chats, stories, tweets, and sound setting

## Run
1. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:5173`.

For production, run `npm run build` then `npm start`. The Express server serves the built Vite client from `dist/`.

## API
- `GET /api/health`
- `GET /api/weather`
- `POST /api/chat`
- `POST /api/tweet-replies`
- `POST /api/reply-to-user`
- `POST /api/generate-story`

## Gemini
The server tries `gemini-3.8-flash` first and then `gemini-3.5-flash-lite`. Gemini output is schema-constrained JSON for the chat/reply/story generation paths. The API key is never exposed to browser code.

## Notes
- Browser photo uploads and voice notes are stored in local browser state as data URLs, so keep media sizes modest.
- Fake calls deliberately do not use a telephony/video service; they ring, connect, and show a timer inside the UI.
- Proactive DMs are generated periodically while the app is open. If the AI request fails, the app shows an error toast and does not inject unrelated text.
