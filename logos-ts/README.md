# Logos TypeScript SDK

The official TypeScript SDK for interacting with the Logos Compliance Program on Solana.
Designed for AI Agents and dApps to log decisions immutably.

## Installation

Since this package is in active development, install it from the local source:

```bash
npm install ./logos_project/logos-ts
```

Or if you have the tarball:

```bash
npm install ./logos-network-sdk-0.1.0.tgz
```

## Features
- **Proof of Decision (PoD)**: Hashing and logging logic.
- **Solana Web3.js Integration**: Built-in transaction construction.
- **Privacy Preserving**: Logs hashes, keeps data off-chain.

## Usage

### 1. Initialize Agent
```typescript
import { LogosAgent } from '@logos-network/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection("https://api.devnet.solana.com");
// Load your agent's keypair
const wallet = Keypair.fromSecretKey(...);

const agent = new LogosAgent(connection, wallet);
```

### 2. Log a Decision
```typescript
const txId = await agent.logDecision({
    objective_id: "trade_strategy_alpha",
    observations: [
        { source: "jupiter", content: { price: 105.2 }, timestamp: Date.now() }
    ],
    action_plan: {
        action: "SWAP",
        amount: 100,
        token: "USDC"
    }
});

console.log("Logged on-chain:", txId);
```

## Building
```bash
npm install
npm run build
```
