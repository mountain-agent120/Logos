# Logos Integration API (Draft v1)

## Overview
This API allows agent developers (Varuna, REKT Shield, etc.) to integrate "Proof of Decision" reliability logs into their workflow with a single HTTP request.

## Authentication
- **Header**: `X-Logos-Agent-Key: <YOUR_AGENT_PUBLIC_KEY>`

## Endpoints

### 1. Log Decision (The core "Flight Recorder")
Records an immutable log of what an agent saw and what it decided to do.

- **URL**: `POST /api/v1/log`
- **Body**:
```json
{
  "objective_id": "string",       // e.g., "protect_position_aave_v3"
  "observation": [                // Supports single dict or list (Batch)
    {
      "protocol": "Aave",
      "health_factor": 1.05
    }
  ],
  "action": {                     // The decided action
    "type": "REPAY",
    "params": {
      "asset": "USDC",
      "amount": 1000
    }
  },
  "options": {
    "commit_level": "finalized"   // "finalized" (on-chain) or "processed" (fast)
  }
}
```
- **Response**:
```json
{
  "status": "success",
  "decision_hash": "sha256_hash_of_obs_and_action...",
  "tx_signature": "solana_transaction_signature...",
  "block_time": 1707123456
}
```

### 2. Verify Decision
Checks if a specific decision hash exists on-chain and validates its integrity.

- **URL**: `GET /api/v1/verify/:hash`
- **Response**:
```json
{
  "verified": true,
  "agent_id": "...",
  "objective_id": "...",
  "timestamp": "...",
  "on_chain_proof": "https://solscan.io/tx/..."
}
```

## Integration Examples

### Python (Adapter Pattern)
```python
from logos_sdk import LogosAgent

agent = LogosAgent(api_key="...")

# In your agent's loop
obs = market.get_state()
action = strategy.decide(obs)

# One-liner integration
proof = agent.log(obs, action)
print(f"Decision Verified: {proof.hash}")
```
