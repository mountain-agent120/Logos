# Day 3 Plan: Integration & Deployment

## Objectives
1. **On-Chain Core**: Deploy Anchor program to Devnet and verify State PDA creation.
2. **Integration APIs**: Design and document REST APIs for partners (Varuna, REKT Shield).
3. **Community**: Analyze feedback and respond to key partners.

## Task Breakdown

### 1. On-Chain Development (Priority: High)
- [ ] Build Anchor program (Running...)
- [ ] Fix `Anchor.toml` configuration (Provider wallet/cluster)
- [ ] Deploy to Devnet (`anchor deploy`)
- [ ] Create Python script to initialize State PDA (`scripts/init_onchain.py`)

### 2. Integration API Design (Priority: Medium)
Strategy: Create a middleware/sidecar specification that agents can run easily.

- **Varuna Integration**:
  - Needs: Batch observation logging linked to action.
  - Endpoint: `POST /log` (accepts batch obs)
  - Output: Transaction signature + Decision Hash

- **REKT Shield Integration**:
  - Needs: Threat context snapshotting.
  - Endpoint: `POST /snapshot` (stores hash, returns ID for later linking)

### 3. Community Engagement
- [ ] Analyze 18 new comments on Post 655.
- [ ] Reply to Sipher on Post 711 (acknowledge privacy integration).
- [ ] Post "Day 3 Update" only after on-chain deployment.

## Technical Notes
- **Hybrid Storage**:
  - State PDA: `[b"state", agent_key, objective_id]`
  - Event: `emit!(LogDecision { ... })`
