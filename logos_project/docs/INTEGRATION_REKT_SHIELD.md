# Integration Guide: REKT Shield × Logos

**For**: REKT Shield Threat Detection  
**Use Case**: Immutable Thread Intelligence & Incident Response Logistics  
**Integration Time**: ~15 minutes

---

## Overview

REKT Shield protects protocols by detecting and blocking malicious transactions. By integrating Logos, you can create a **verifiable incident log** that proves:
1. **Detection**: Why a transaction was flagged (e.g., heuristics, simulation results).
2. **Response**: Why a specific automated action was taken (e.g., pause protocol, block IP).
3. **Timeline**: The exact sequence of events, verified on-chain.

This turns your security agent from a "black box" into an **auditable security guard**.

---

## Quick Start

### 1. Install Logos SDK

```bash
pip install solana solders
# Clone Logos SDK
git clone https://github.com/mountain-agent120/Logos.git
cd Logos
pip install -r requirements.txt
```

### 2. Initialize Logos Agent

```python
from sdk.core import LogosAgent

# Initialize your security agent identity
agent = LogosAgent(
    agent_id="REKT-Shield-Bot-001",
    objective_id="Threat-Detection-Policy-V2"
)
```

### 3. Log Security Events

When REKT Shield detects a threat, generate a "Proof of Threat" before taking action:

```python
import time

# 1. Capture Threat Intelligence (Observation)
threat_observation = {
    "target_tx": "5xTx...abc",
    "threat_type": "Reentrancy Attempt",
    "simulation_result": "Vault drained (-1000 SOL)",
    "heuristics": {
        "call_depth": 5,
        "flash_loan": True
    },
    "timestamp": time.time()
}

# 2. Define Response (Action)
response_action = {
    "type": "PAUSE_PROTOCOL",
    "target_contract": "Vault-V1",
    "severity": "CRITICAL"
}

# 3. Generate Immutable Proof
decision_hash = agent.decide(
    observation=threat_observation,
    action=response_action
)

print(f"Proof of Threat Generated: {decision_hash}")
```

### 4. Commit to Solana (via API)

```python
import requests

# Log to Logos immediately (or concurrently with action)
resp = requests.post("https://your-logos-api/log", json={
    "objective_id": "Threat-Detection-Policy-V2",
    "observations": [threat_observation],
    "action_plan": response_action,
    "dry_run": False
})

print(f"Incident Logged on Solana: {resp.json()['explorer_url']}")
```

---

## Architecture: The "Black Box" Recorder

```
┌─────────────────────────────────────────────────────────────┐
│ REKT Shield Agent                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Monitor Mempool / Blocks                                │
│     ↓                                                       │
│  2. Detect Anomaly (e.g. Flash Loan Attack)                 │
│     ↓                                                       │
│  3. Run Simulation (Confirm Threat)                         │
│     ↓                                                       │
│  4. Generate Logos Hash (Proof of Threat)  ← COMMIT HERE    │
│     ↓                                                       │
│  5. Execute Defense (Front-run / Pause)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why Log to Logos?**
- **False Positive Defense**: If you block a legitimate user, you have proof of *why* you thought they were malicious.
- **Post-Mortem**: Security teams can reconstruct the exact state of the world when the decision was made.
- **Automated Insurance**: Prove to insurers that the protocol paused *before* the exploit completed (or why it failed).

---

## Use Case: Collaborative Defense

Logos enables **multi-agent security coordination**.

1. **REKT Shield** detects a new attack vector on Protocol A.
2. REKT Shield logs the threat signature to Logos (publicly verifiable).
3. **Other Security Agents** (e.g., Varuna) observe the Logos event.
4. They verify the signature and proactively protect Protocol B against the same vector.

```python
# Other agents can verify:
is_valid = logos.verify_threat(
    agent="REKT-Shield-Bot-001",
    threat_hash="..."
)
if is_valid:
    activate_defenses()
```

---

## Example: Full Incident Response Loop

```python
def handle_suspicious_tx(tx_data):
    # 1. Analyze
    is_malicious, details = analyze_transaction(tx_data)
    
    if not is_malicious:
        return

    # 2. Log Decision (Logos)
    observation = {
        "tx_signature": tx_data.signature,
        "analysis_details": details,
        "timestamp": time.time()
    }
    
    action = {"type": "BLOCK_SENDER", "address": tx_data.sender}
    
    # 3. Commit Proof
    agent.decide(observation, action)
    api.log_decision(observation, action)  # Async call
    
    # 4. Execute Defense (Critical Path)
    blacklist.add(tx_data.sender)
    
    print(f"Threat blocked. Audit trail generated.")
```

---

## FAQ

### Q: Should I log confidential threat intel?
**A**: **No.** Logos logs are public. 
- Hash sensitive data (e.g., user IPs) *before* including them in the observation.
- Or, include encrypted fields in the observation, and reveal keys only to authorized auditors.

### Q: Will this add latency to my response?
**A**: Not necessarily.
- Generate the hash (microseconds) synchronously.
- Log to Solana (milliseconds/seconds) **asynchronously**.
- The decision is cryptographically secured the moment you hash it, even if it hits the chain a few seconds later.

---

## Support

- **Logos Forum**: [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/forum)
- **Contact**: Yamakun (#239)

Let's build a safer Solana ecosystem together. 🛡️
