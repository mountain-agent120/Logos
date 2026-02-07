# Logos 🛡️
**The 'Black Box' Flight Recorder for the Agent Economy.**

> *"Trust, but Verify."* — Now for Autonomous Agents.

[![Solana Devnet](https://img.shields.io/badge/Solana_Devnet-Live-green?style=for-the-badge&logo=solana)](https://explorer.solana.com/address/Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3?cluster=devnet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Hackathon: Colosseum](https://img.shields.io/badge/Colosseum-Agent_Hackathon-blueviolet?style=for-the-badge)](https://colosseum.com)

**Logos provides the immutable "Proof of Decision" layer that agents need to scale.** 
By cryptographically anchoring every decision to Solana, we protect users from hallucinations, developers from liability, and the ecosystem from opacity.

When your agent makes a $1M trade at 3am, Logos proves **what** it saw and **why** it acted.

---

## 🚨 New: Adversarial Mode (Red Team Console)

**Logos isn't just about logging success; it's about preventing failure.**
We've introduced **Adversarial Mode** to demonstrate Logos's capability to detect and log malicious or erroneous agent behavior.

### 🔴 Try the 'Red Team' Experience:
1. Go to the [**Live Dashboard**](https://mountain-agent120.github.io/Logos/).
2. Toggle **"Adversarial Mode"** in the top-right corner.
3. The interface transforms into a **Red Team Console**.
4. Attempt to execute a **"Rug Pull"** (Treasury Drain) or **"Sanctions Evasion"**.
5. Watch Logos **BLOCK** the action and record the policy violation immutably on-chain.

> *This feature empowers developers to test their agent's compliance boundaries before mainnet.*

---

## 🔮 New: Verified Prediction Markets (Commit-Reveal)

**Proving you were right, without revealing your alpha.**

We have implemented the **Commit-Reveal Pattern** for Prediction Market Agents:
1. **Commit**: Log a hash of your prediction + salt on-chain (timestamped proof).
2. **Reveal**: Later, expose the data and salt to verify the prediction matches the commitment.
3. **Verify**: Anyone can cryptographically verify the prediction was made *before* the event, without the agent leaking their position during the event.

*Feature requested by @nox. Full example in SDK docs.*

---

## 🌐 Live on Devnet

**Canonical Program ID**: `Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3`

- **Explorer Link**: [View Program on Solana Explorer](https://explorer.solana.com/address/Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3?cluster=devnet)
- **Status**: Active, accepting `log_decision` instructions.

---

## 📖 The Problem

AI agents are managing billions in DeFi. When something goes wrong:
- **Operators** can't prove the agent followed its policy
- **Auditors** can't verify decisions without accessing proprietary models
- **Users** have no transparency into why their funds were moved

**Logging "thoughts" is dangerous.** Internal reasoning can be manipulated, hallucinated, or reverse-engineered to expose IP.

## 💡 The Solution: Proof of Decision (PoD)

Logos creates a **cryptographic link** between:
1. **What the agent saw** (Observation Hash)
2. **What it was trying to do** (Objective ID)
3. **What it did** (Action + Transaction Signature)

Think of it as a **flight recorder** for your agent — tamper-proof, verifiable, and privacy-preserving.

**Important:** Logos does **NOT** log chain-of-thought or internal reasoning. It logs **decision intent metadata** (hashed and minimal). Your proprietary models and strategies remain private.

---

## 🛠 Integration (SDK)

We provide a robust **TypeScript SDK** for seamless integration.

### Installation
```bash
npm install @logos-network/sdk
# (Currently available via local path or git)
```

### Usage
```typescript
import { LogosAgent } from '@logos-network/sdk';

// Initialize with your Wallet and Connection
const agent = new LogosAgent({ connection, wallet });

// 1. Register your Agent
await agent.registerAgent("MyTradingBot_v1");

// 2. Log a Decision (Privacy-Preserving)
// The 'actionPlan' is hashed and hidden. Only 'publicNote' (Memo) is visible.
const tx = await agent.logDecision({
    objectiveId: "ARB_STRATEGY_ETH_USDC",
    observations: [{ type: "price", source: "jupiter", value: 2500 }],
    actionPlan: { 
        action: "swap", 
        amount: 10, 
        input: "ETH", 
        output: "USDC",
        strategy_hidden: "Alpha_V2_Secret" 
    }
}, {
    publicNote: "Executing Swap 10 ETH -> USDC (Strategy Alpha)" // Visible on Dashboard via Memo
});

console.log("Proof of Decision anchored on Solana:", tx);
```

---

## 🤝 Partners & Ecosystem

Logos is proud to be integrated with leading autonomous protocols:

- **Varuna** (@ai-nan): DeFi liquidation protection & unified observation layer.
- **REKT Shield** (@Youth): Real-time threat response logging.
- **Noxium** (@ace-kage-agent): Risk assessment transparency.
- **AgentMemory**: Hybrid storage solutions.
- **Ziggy (WARGAMES)**: *Targeted for Adversarial Simulation integration.*
- **nox (@nox_prediction)**: *Prediction Market Commit-Reveal Pattern.*

---

## 📂 Repository Structure

```
logos/
├── programs/
│   └── logos_core/          # Canonical Anchor Smart Contract (Rust)
├── sdk/
│   └── logos-ts/            # TypeScript SDK (Production Ready)
├── web/                     # Compliance Dashboard & Red Team Console
├── scripts/                 # Deployment & Demo Automation
└── docs/                    # Integration Guides & Architecture Specs
```

---

## 🛡️ Security Model

**What Logos Protects**:
- ✅ Proof that decision was made at specific time
- ✅ Cryptographic link between observation and action
- ✅ Tamper-proof audit trail

**What Logos Does NOT Protect**:
- ❌ Correctness of AI model's logic (Garbage In, Garbage Out)
- ❌ Security of observation data sources (Oracle manipulation)
- ❌ Legal liability (you're still responsible for your agent)

Logos is a **risk management tool**, not a liability shield.

---

## 📜 License

MIT License - see [LICENSE](./LICENSE)

---

**Built with ❤️ for the Agent Economy.**
*Yamakun (#239) | Colosseum Agent Hackathon 2026*
