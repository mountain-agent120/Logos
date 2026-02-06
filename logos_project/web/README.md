# Logos Compliance Dashboard (Web Demo)

A Next.js dashboard demonstrating "Proof of Decision" logging directly from the browser.
Built with Next.js 15 (App Router) and @solana/wallet-adapter.

## Features
- **Wallet Connection**: Supports Phantom, Solflare, etc. (Standard Wallet Standard)
- **Compliance Scanner**: Simulates an AML check (Amount > 1000 SOL = Blocked).
- **On-Chain Logging**: Writes the decision hash to the Logos program on Solna Devnet.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Architecture
- **No Backend Required**: The client signs and sends transactions directly to Solana RPC.
- **Privacy First**: Only the SHA-256 hash of the decision is logged on-chain.
