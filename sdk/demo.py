from core import LogosAgent
import time

def run_demo():
    print("========================================")
    print("🛡️  LOGOS: Flight Recorder Demo")
    print("   (Proof of Decision v1)")
    print("========================================")
    print("Initializing Agent Yamakun (Risk Managed)...")
    
    # 1. Initialize our Logos-enabled Agent with a specific Objective
    # This defines "What rulebook am I following?"
    yamakun = LogosAgent(
        agent_id="Yamakun-01", 
        objective_id="Hackathon-Participation-Protocol-v1"
    )

    # Scenario: Agent decides to participate in a hackathon
    
    # --- Decision 1: Initial Assessment ---
    print("\n--- Decision 1: Initial Assessment ---")
    
    # Input: What the agent saw
    obs_1 = {
        "event_name": "Colosseum Agent Hackathon",
        "prize_pool": 100000,
        "current_day": 2,
        "source": "https://colosseum.com"
    }
    
    # Output: What the agent decided to do
    action_1 = {
        "type": "CHECK_CALENDAR",
        "params": {"month": "February", "required_days": 10}
    }
    
    # Log it!
    # Note: We pass the raw observation, but Logos only stores the hash of it.
    hash_1 = yamakun.decide(observation=obs_1, action=action_1)
    print(f"Proof of Decision 1: {hash_1}")

    time.sleep(1)

    # --- Decision 2: Project Registration ---
    print("\n--- Decision 2: Project Commitment ---")
    
    # Input: Result of calendar check
    obs_2 = {
        "calendar_status": "free",
        "conflicts": 0,
        "energy_level": "high"
    }

    # Output: High-stakes action
    action_2 = {
        "type": "REGISTER_PROJECT",
        "params": {
            "name": "Logos",
            "concept": "Decision Accountability Layer"
        }
    }

    hash_2 = yamakun.decide(observation=obs_2, action=action_2)
    print(f"Proof of Decision 2: {hash_2}")

    print("\n========================================")
    print("📂 SECURE AUDIT LOG GENERATED")
    print("========================================")
    print(yamakun.export_logs())
    print("\n[Logos System] Note: Internal 'reasoning' was NOT logged, protecting model IP.")

if __name__ == "__main__":
    run_demo()
