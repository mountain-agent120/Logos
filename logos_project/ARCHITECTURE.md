# Logos: Architecture Design (Revised v2)

## 1. Vision
**"Manage the Risk, Verify the Decision."**
Logos is a **Decision Accountability Layer** for autonomous agents.
Instead of exposing sensitive internal reasoning (Chain of Thought), Logos records the **Decision Context**—creating a tamper-evident link between what an agent saw, what it was trying to enforce, and what it actually did.

## 2. Core Concepts
- **Proof of Decision (PoD)**: A cryptographic commitment to the inputs and outputs of a decision process, structured for automated auditing.
- **Decision Record**: The atomic unit of accountability.
- **Objective ID**: A unique identifier for the policy or goal the agent was serving (e.g., "Arbitrage-Strategy-v1").

## 3. Data Structures

### The Decision Record (Off-Chain JSON)
We store **what** happened, not **how** the brain worked.

```json
{
  "agent_id": "Yamakun-01",
  "timestamp": 1707000000,
  "objective_id": "High-Yield-Stable-Farming-Policy-v1", 
  "snapshot": {
    "observation_hash": "sha256(market_data_snapshot)", 
    "action_payload": {
      "type": "SWAP",
      "target": "JUPITER",
      "params": { "input": "SOL", "output": "USDC", "min_out": 100 }
    }
  },
  "risk_assessment": {
    "checks_passed": ["slippage_check", "liquidity_check"],
    "confidence_score": 0.98
  },
  "signature": "sEd25519_signature..."
}
```

*Note: The actual 'market_data_snapshot' is stored in decentralized storage (IPFS/Arweave), referenced here by hash to ensure data integrity without bloating the record.*

## 4. Technical Implementation (MVP)

### Off-Chain (Python SDK)
- Standardizes interaction with risk-managed protocols.
- **`decide(observation, action)`**:
  - Hashes the observation (`SHA256`).
  - Creates a `DecisionStructure`.
  - Returns the deterministic hash for signing.

### On-Chain (Solana/Anchor)
**Hybrid Storage Model:**
To balance cost (rent) and composability, Logos uses a hybrid approach:

1.  **State PDA (`AgentState`)**:
    - Stores **mutable, summary data** on-chain.
    - Accessible by other programs (CPI) for verification.
    - Fields: `decision_count`, `last_per_hash`, `reputation_score`.
    - Seed: `[b"state", agent_pubkey, objective_id]`.

2.  **Event Logs (`emit!`)**:
    - Stores **immutable, detailed history** (Observation Hash, Action Payload).
    - Optimized for off-chain indexing (Helius, The Graph).
    - Cost-effective for high-frequency decision logging.

- **`log_decision` Instruction**:
  - Updates `AgentState` PDA (increments count, updates hash).
  - Emits `DecisionEvent` with full details.

## 5. Roadmap

### Phase 1: The Flight Recorder (Current)
- SHA-256 Hashing of Observations.
- Immutable On-Chain Storage.
- Basic Risk Analysis Dashboard.

### Phase 2: Privacy & Verification (ZK-SNARKs)
*Contribution inspired by @KAMIYO*
- **ZK Decision Proofs**: Prove that an observation met a quality threshold (e.g., "Liquidity > $1M") *without* revealing the exact data source or proprietary analysis logic.
- **Circuit Design**: Implement ZK circuits to validate that `Hash(PrivateData) == PublicHash` and `QualityCheck(PrivateData) == True`.

### Phase 3: The Guardian Network
- Decentralized network of "Auditor Agents" that verify decision logs against outcome realities.

## 6. Why This is Safer

| Old Approach (Proof of Thought) | New Approach (Proof of Decision) |
| ------------------------------- | -------------------------------- |
| Exposed internal LLM reasoning | Keeps internals opaque/secure |
| Hard to verify (subjective text) | Easy to verify (Input + Output) |
| Risk of prompt injection leaks | No prompt leakage |
| "AI takes responsibility" (Legal risk) | **"Operator manages risk"** (Tooling) |

## 6. Workflow

1. **Agent** wakes up with `Objective: Arbitrage`.
2. **Agent** fetches `MarketData` (Observation).
3. **Logos SDK** captures `Hash(MarketData)`.
4. **Agent** decides to `Swap`.
5. **Logos SDK** constructs `DecisionRecord` -> `Hash`.
6. **Agent** submits Tx: `[Logos::log_decision(Hash)]` + `[Jupiter::Swap]`.
7. **Operator/Auditor** later pulls the record:
   - "Ah, the agent swapped because it saw Price X at Time T."
   - "This matches Objective Y."
   - **Verification Complete.**
