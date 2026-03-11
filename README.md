# Deposition Contradiction Detector

A React/Vite app that compares two deposition transcripts and identifies contradictions between witness statements.

The app uses Claude to extract candidate contradiction pairs, but it does not rely on the LLM alone for final output. Contradiction type and confidence are determined with deterministic app-side scoring logic, which classifies results into:

- Direct contradictions
- Inferential contradictions
- False positives

This makes the output more explainable, more consistent, and less dependent on raw model judgment.

## Run locally

```sh
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` starts both the Express API server (port 3001) and the Vite dev server (port 5173) concurrently.

## Environment

Create a `.env` file with:

```sh
ANTHROPIC_API_KEY=your_key_here
```

The key is read server-side only. It is never bundled into client JavaScript or sent to the browser.
