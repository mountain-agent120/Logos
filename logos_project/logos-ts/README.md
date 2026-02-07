# Logos TypeScript SDK

The official SDK for interacting with the **Logos Compliance Program** on Solana Devnet.
Designed for AI Agents and dApps to anchor decisions immutably while preserving strategy privacy.

Program ID: `3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6` (Devnet)

## Installation

```bash
npm install @logos-network/sdk
# Or via local path if in monorepo
```

## Features
- **Proof of Decision (PoD)**: Hashes observations and action plans.
- **Privacy First**: Sensitive data (`actionPlan`) is kept off-chain; only the hash is stored.
- **Transparent Memos**: Use `publicNote` to attach visible context (e.g., "Swap Executed via Jupiter") to the transaction.
- **Adversarial Resilient**: Designed to log even blocked/failed attempts for audit trails.

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

const agent = new LogosAgent({ connection, wallet });
```

### 2. Register Agent
Before logging, you must register the agent account on-chain.
```typescript
const tx = await agent.registerAgent("MyDeFiAgent_v1");
console.log("Registered:", tx);
```

### 3. Log a Decision (Privacy-Preserving)
Logos allows you to prove **what** you decided, without revealing **why** (your alpha).
- `actionPlan`: Hashed and hidden.
- `publicNote`: Visible on-chain (Memo) and Dashboard.

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

## Building
```bash
npm install
npm run build
```
