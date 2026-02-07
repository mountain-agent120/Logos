# Logos TypeScript SDK

The official SDK for interacting with the **Logos Compliance Program** on Solana Devnet.
Designed for AI Agents and dApps to anchor decisions immutably while preserving strategy privacy.

Program ID: `Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3` (Devnet)

## Installation

```bash
npm install @logos-network/sdk
# Or via local path if in monorepo
```

## Features
- **Proof of Decision (PoD)**: Hashes observations and action plans.
- **Privacy First**: Sensitive data (`actionPlan`) is kept off-chain; only the hash is stored.
- **Commit-Reveal Pattern**: Proves you knew information at a specific time without revealing it (for Prediction Markets).
- **Transparent Memos**: Use `publicNote` to attach visible context to any transaction.
- **Adversarial Resilient**: Designed to create audit trails even in adversarial conditions.

## Usage

### 1. Initialize Agent
```typescript
import { LogosAgent } from '@logos-network/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import fs from 'fs';

const connection = new Connection("https://api.devnet.solana.com");
// Load your agent's keypair (Authority)
const secret = JSON.parse(fs.readFileSync('path/to/key.json', 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

// Initialize Agent
const agent = new LogosAgent({
    connection,
    wallet,
    programId: "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3" // Optional: defaults to Devnet
});
```

### 2. Register Agent
Before logging, you must register the agent account on-chain.
```typescript
const tx = await agent.registerAgent("MyDeFiAgent_v1");
console.log("Registered:", tx);
```

### 3. Log a Decision (Standard Privacy)
Logos allows you to prove **what** you decided, without revealing **why** (your alpha).
- `actionPlan`: Hashed and hidden.
- `publicNote`: Visible on-chain.

```typescript
const txId = await agent.logDecision({
    objectiveId: "trade_strategy_alpha",
    observations: [
        { type: "price", source: "jupiter", value: 105.2, timestamp: Date.now() }
    ],
    actionPlan: {
        action: "SWAP",
        amount: 100,
        token: "USDC",
        strategy_hidden: "EMA_Crossover_Secret_Settings" // Private
    }
}, {
    publicNote: "Executing Swap 100 USDC -> SOL (Rebalance)" // Public
});

console.log("Logged on-chain:", txId);
```

### 4. Commit-Reveal (For Prediction Markets)
Logos supports a "Commit-Reveal" scheme. Use this when you want to prove you knew something *before* it happened, without leaking your alpha.

**Step 1: Commit (Hiding Alpha)**
Logs a hash of your data + salt on-chain.

```typescript
// Define your prediction or sensitive data
const prediction = { 
    asset: "SOL", 
    target_price: 200, 
    rationale: "Technical breakout" 
};
const topicId = "prediction-market-round-1";

// Commit hash on-chain (returns salt for later)
const { signature, salt, commitment } = await agent.commit(prediction, topicId);
console.log("Committed:", signature);
console.log("Keep this salt secret:", salt);
```

**Step 2: Reveal (Proving Alpha)**
Later, reveal the data and salt to prove the original commitment matches.

```typescript
// Reveal on-chain
const { signature: revealTx } = await agent.reveal(prediction, topicId, salt);
console.log("Revealed & Verified:", revealTx);
```

## Building
```bash
npm install
npm run build
```
