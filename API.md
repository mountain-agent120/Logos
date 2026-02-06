# Logos API Specification v0.1

The Logos API provides a standardized interface for AI agents to log verifiable decisions to the Solana blockchain. It abstracts the complexity of cryptographic hashing and blockchain transactions.

## Base URL
`http://localhost:8000` (Default)

## Endpoints

### 1. Log Decision
Submit a decision snapshot for verification logging.

- **URL**: `/log`
- **Method**: `POST`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "objective_id": "OBJ-001",
  "observations": [
    {
      "source": "market_feed",
      "content": {"price": 105.5, "symbol": "SOL"},
      "timestamp": 1707123456.789
    }
  ],
  "action_plan": {
    "action": "buy",
    "amount": 10,
    "confidence": 0.95
  },
  "dry_run": false
}
```

**Response:**
```json
{
  "decision_hash": "a1b2c3d4...", 
  "signature": "5xTk...", 
  "status": "committed",
  "timestamp": "2026-02-05T10:00:00"
}
```
- `decision_hash`: The SHA-256 hash of the canonicalized input (Proof of Decision).
- `signature`: The Solana transaction signature (TxID).

### 2. Verify Decision
Check if a specific decision hash exists on-chain.

- **URL**: `/verify/{decision_hash}`
- **Method**: `GET`

**Response:**
```json
{
  "decision_hash": "a1b2c3d4...",
  "verified": true,
  "onchain_data": {
    "objective_id": "OBJ-001",
    "agent": "Ag3nt...",
    "timestamp": 1707123456
  }
}
```

## Integration Guide

### Python Example
```python
import requests

data = {
    "objective_id": "hackathon-demo",
    "observations": [{"source": "sensor", "content": {"temp": 25}, "timestamp": 0}],
    "action_plan": {"cmd": "alert"},
    "dry_run": False
}

res = requests.post("http://localhost:8000/log", json=data)
print(res.json())
```
