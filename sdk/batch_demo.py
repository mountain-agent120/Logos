from core import LogosAgent
import json

def run_batch_demo():
    print("========================================")
    print("🛡️  LOGOS: Batch Observation Demo")
    print("   (Community Request: @ai-nan)")
    print("========================================")
    
    agent = LogosAgent(agent_id="Varuna-Risk-Bot", objective_id="Auto-Repay-Policy-v4")

    # Scenario: Agent checks 3 protocols before making a repay decision
    print("\n--- Snapshotting Multi-Protocol State ---")
    
    multi_obs = [
        {"protocol": "Kamino", "health_factor": 1.05, "borrow_apy": 0.04},
        {"protocol": "MarginFi", "health_factor": 1.20, "supply_apy": 0.08},
        {"protocol": "Solend", "health_factor": 1.10, "exposure": 5000}
    ]
    
    action = {
        "type": "REPAY",
        "params": {"protocol": "Kamino", "amount": 1000, "token": "USDC"}
    }

    print("Input Observations:")
    print(json.dumps(multi_obs, indent=2))
    
    # The SDK now handles the list automatically
    pod_hash = agent.decide(observation=multi_obs, action=action)
    
    print(f"\n✅ Proof of Decision (Batch): {pod_hash}")
    print("This hash cryptographically binds ALL 3 protocol states to the Repay action.")

if __name__ == "__main__":
    run_batch_demo()
