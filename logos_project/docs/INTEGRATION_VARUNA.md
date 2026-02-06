# Integration Guide: Varuna × Logos

**For**: Varuna DeFi Liquidation Protection  
**Use Case**: Auditable liquidation decision logging  
**Integration Time**: ~15 minutes

---

## Overview

Varuna protects users from unfair liquidations. By integrating Logos, you can create an **immutable audit trail** of every liquidation decision, proving that:
1. The agent observed accurate market data
2. The liquidation was justified by the protocol's rules
3. The decision was made at a specific timestamp

This enables:
- **Dispute Resolution**: Users can verify if a liquidation was fair
- **Regulatory Compliance**: Prove your agent followed its policy
- **Risk Management**: Audit trail for post-mortem analysis

---

## Quick Start

### 1. Install Logos SDK

```bash
pip install solana solders
# Clone Logos SDK (until PyPI package is published)
git clone https://github.com/mountain-agent120/Logos.git
cd Logos
pip install -r requirements.txt
```

### 2. Initialize Logos Agent

```python
from sdk.core import LogosAgent
import time

# Create a Logos agent for your liquidation bot
agent = LogosAgent(
    agent_id="Varuna-Liquidator-001",
    objective_id="Liquidation-Policy-V1"
)
```

### 3. Log Liquidation Decisions

**Before executing a liquidation**, capture the observation and generate a decision hash:

```python
# Example: Liquidation decision for a user position
observation = {
    "user_position": "7xKj...abc",
    "collateral_value": 1000.0,  # USD
    "debt_value": 950.0,         # USD
    "health_factor": 1.05,       # Below threshold (1.1)
    "oracle_price_sol": 100.5,   # SOL/USD
    "timestamp": time.time()
}

action = {
    "type": "liquidate",
    "position": "7xKj...abc",
    "collateral_seized": 500.0,  # USD
    "liquidation_bonus": 5.0     # %
}

# Generate decision hash
decision_hash = agent.decide(
    observation=observation,
    action=action
)

print(f"Decision Hash: {decision_hash}")
# Output: "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
```

### 4. Commit to Solana (via API)

```python
import requests

response = requests.post("https://your-logos-api/log", json={
    "objective_id": "Liquidation-Policy-V1",
    "observations": [observation],
    "action_plan": action,
    "dry_run": False  # Set to True for testing
})

signature = response.json()["signature"]
explorer_url = response.json()["explorer_url"]

print(f"Logged to Solana: {explorer_url}")
```

### 5. Execute Liquidation

**After** logging to Logos, execute the actual liquidation transaction:

```python
# Your existing liquidation logic
varuna_liquidation_tx = execute_liquidation(position="7xKj...abc")
```

---

## Architecture: How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ Varuna Liquidation Bot                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Monitor Positions                                       │
│     ↓                                                       │
│  2. Detect Unhealthy Position (Health Factor < 1.1)        │
│     ↓                                                       │
│  3. Capture Observation (price, collateral, debt)          │
│     ↓                                                       │
│  4. Generate Decision Hash (SHA-256)                        │
│     ↓                                                       │
│  5. Log to Logos (Solana Event + PDA)  ← AUDIT TRAIL       │
│     ↓                                                       │
│  6. Execute Liquidation (Varuna Protocol)                   │
│     ↓                                                       │
│  7. Link Liquidation TX to Decision Hash (optional)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight**: The decision hash is created **before** the liquidation, proving that the agent had valid reasons at the time of execution.

---

## Verification Flow

When a user disputes a liquidation:

1. **User Claims**: "I was unfairly liquidated at 3am"
2. **You Provide**: Decision Hash + Observation Data
3. **User Verifies**:
   ```python
   import hashlib
   import json
   
   # Reconstruct hash from observation
   data = json.dumps(observation, sort_keys=True).encode()
   reconstructed_hash = hashlib.sha256(data).hexdigest()
   
   # Compare with on-chain hash
   assert reconstructed_hash == decision_hash
   ```
4. **On-Chain Proof**: Query Logos PDA to confirm hash was logged at timestamp T
5. **Outcome**: User can see that the liquidation was based on accurate data

---

## Advanced: Batch Observations

For high-frequency liquidation bots, use batch observation hashing:

```python
from sdk.core import LogosAgent

agent = LogosAgent(
    agent_id="Varuna-HFT-Liquidator",
    objective_id="HFT-Liquidation-V1"
)

# Multiple observations (e.g., from Jupiter, Pyth, Switchboard)
observations = [
    {"source": "jupiter", "sol_price": 100.5, "timestamp": 1234567890},
    {"source": "pyth", "sol_price": 100.6, "timestamp": 1234567891},
    {"source": "switchboard", "sol_price": 100.4, "timestamp": 1234567892}
]

action = {"liquidate": "7xKj...abc"}

# Logos will hash all observations together
decision_hash = agent.decide(observations, action)
```

This proves you used **multiple data sources** for the decision.

---

## Integration Checklist

- [ ] Install Logos SDK
- [ ] Create `LogosAgent` instance with unique `agent_id`
- [ ] Modify liquidation logic to call `agent.decide()` **before** execution
- [ ] Log decision hash to Solana (via API or SDK)
- [ ] Store decision hash in your database (link to liquidation TX)
- [ ] Implement dispute resolution flow (provide observation data on request)
- [ ] Test with `dry_run=True` on Devnet
- [ ] Deploy to production

---

## Example: Full Integration

```python
import time
from sdk.core import LogosAgent
import requests

# Initialize
agent = LogosAgent(
    agent_id="Varuna-Liquidator-001",
    objective_id="Liquidation-Policy-V1"
)

def liquidate_position(position_pubkey, health_factor, collateral_value, debt_value):
    """
    Liquidate a position with Logos audit trail.
    """
    # 1. Capture observation
    observation = {
        "position": str(position_pubkey),
        "health_factor": health_factor,
        "collateral_value": collateral_value,
        "debt_value": debt_value,
        "oracle_price": get_oracle_price(),  # Your oracle integration
        "timestamp": time.time()
    }
    
    action = {
        "type": "liquidate",
        "position": str(position_pubkey),
        "collateral_seized": collateral_value * 0.5,  # Example
        "liquidation_bonus": 5.0
    }
    
    # 2. Generate decision hash
    decision_hash = agent.decide(observation, action)
    
    # 3. Log to Logos
    response = requests.post("https://your-logos-api/log", json={
        "objective_id": "Liquidation-Policy-V1",
        "observations": [observation],
        "action_plan": action,
        "dry_run": False
    })
    
    if response.status_code != 200:
        raise Exception(f"Logos logging failed: {response.text}")
    
    logos_signature = response.json()["signature"]
    
    # 4. Execute liquidation
    liquidation_tx = execute_varuna_liquidation(position_pubkey)
    
    # 5. Store link in your DB
    db.save({
        "liquidation_tx": liquidation_tx,
        "logos_decision_hash": decision_hash,
        "logos_signature": logos_signature,
        "timestamp": time.time()
    })
    
    print(f"✅ Liquidation complete. Logos proof: {logos_signature}")
    return liquidation_tx
```

---

## FAQ

### Q: Does Logos slow down my liquidation bot?
**A**: No. Logging to Logos takes ~200ms (HTTP request). You can also log asynchronously after the liquidation.

### Q: What if Logos API is down?
**A**: You can still generate the decision hash locally (it's deterministic). Log it to Logos later, or store it in your own database.

### Q: Can users fake the observation data?
**A**: No. The hash is committed on-chain **before** the liquidation. If the user provides different observation data, the hash won't match.

### Q: Do I need to expose my liquidation algorithm?
**A**: No. You only expose the **observation data** (prices, balances) and the **action** (liquidate). Your internal logic (e.g., risk scoring) remains private.

---

## Support

- **Logos Forum**: [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/forum)
- **GitHub Issues**: [mountain-agent120/Logos](https://github.com/mountain-agent120/Logos/issues)
- **Contact**: Yamakun (#239)

---

**Ready to integrate?** Start with the Quick Start guide above, or reach out on the forum for help!
