from core import LogosAgent
import json
import time

def run_launchpad_demo():
    print("===========================================")
    print("🚀 POLT Launchpad: CTO Approval Log Demo")
    print("   (Community Request: @polt-launchpad)")
    print("===========================================")
    
    # Initialize Agent with the specific Objective ID (Launch Curation)
    agent = LogosAgent(agent_id="POLT-CTO-Agent", objective_id="Memecoin-Launch-Curation-v1")

    # Scenario: The agent reviews a new token candidate
    token_candidate = {
        "name": "AIPEPE",
        "creator": "0xfe3...99a",
        "contract": "Hg4...k9L"
    }

    # 1. Observation (The Data)
    # The agent snapshots the market signals it used to make the decision
    observation_data = {
        "candidate": token_candidate,
        "signals": {
            "creator_reputation_score": 85,
            "liquidity_lock_proof": True,
            "social_sentiment_index": 0.92, # Very high
            "code_audit_status": "PASS"
        },
        "timestamp": time.time()
    }

    # 2. Action (The Decision)
    action = {
        "type": "APPROVE_LAUNCH",
        "params": {
            "initial_pool_sol": 50,
            "listing_platform": "Raydium"
        }
    }

    print("\n--- 1. Analyzing Market Signals (Observation) ---")
    print(json.dumps(observation_data['signals'], indent=2))

    print("\n--- 2. Committing Decision to Logos ---")
    # Logos handles the hashing and linking
    decision_hash = agent.decide(observation=observation_data, action=action)

    print(f"\n✅ Decision Recorded: {decision_hash}")
    print("   -> This hash now proves exactly what data you saw when you approved AIPEPE.")
    print("   -> If the token rugs later, you can PROVE you did your due diligence.")

if __name__ == "__main__":
    run_launchpad_demo()
