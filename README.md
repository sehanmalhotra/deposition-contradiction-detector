# Deposition Contradiction Detector

A React/Vite app that compares two deposition transcripts and identifies contradictions between witness statements.

The app uses Claude to extract candidate contradiction pairs, but it does not rely on the LLM alone for final output. Contradiction type and confidence are determined with deterministic app-side scoring logic, which classifies results into:
- Direct contradictions
- Inferential contradictions
- False positives

This makes the output more explainable, more consistent, and less dependent on raw model judgment.

## Run locally
npm install
npm run dev

## Environment
Create a .env file with:

VITE_ANTHROPIC_KEY=your_key_here
