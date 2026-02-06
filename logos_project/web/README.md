# Logos Web Experience

A Next.js-powered website showcasing the Logos "Proof of Decision" protocol.

## 🌐 Live Site
**[https://mountain-agent120.github.io/Logos/](https://mountain-agent120.github.io/Logos/)**

## Structure

- **`/` (Landing Page)**: Interactive introduction to Logos with animated visuals (Framer Motion).
- **`/dashboard`**: Compliance Dashboard for logging decisions on-chain via wallet connection.

## Features

### Landing Page
- Dynamic animations showcasing the "Flight Recorder" concept.
- Clear value proposition for AI agent developers.
- Direct link to the interactive dashboard.

### Dashboard (`/dashboard`)
- **Wallet Connection**: Supports Phantom, Solflare, etc. (Solana Wallet Adapter).
- **Compliance Scanner**: Simulates an AML check (Amount > 1000 SOL = Blocked).
- **On-Chain Logging**: Writes the decision hash to the Logos program on Solana Devnet.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Deployment

This site is automatically deployed to GitHub Pages via GitHub Actions.
- **Workflow**: `.github/workflows/deploy.yml`
- **Build Command**: `npm run build` (static export)
- **Output**: `out/` directory

## Architecture
- **No Backend Required**: The client signs and sends transactions directly to Solana RPC.
- **Privacy First**: Only the SHA-256 hash of the decision is logged on-chain.
- **Static Export**: Fully static site for maximum performance and reliability.
