import sys
import os
import time
import json
import hashlib
from typing import Dict, Any

# Add current dir to path to import sdk
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sdk.compliance import ComplianceProvider
from sdk.onchain_utils import build_log_decision_ix, build_register_agent_ix
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction

# Constants
PROGRAM_ID = Pubkey.from_string("Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3")

class LogosAgentWrapper:
    def __init__(self, client: Client, keypair_path: str):
        self.client = client
        with open(keypair_path, "r") as f:
            data = json.load(f)
        self.keypair = Keypair.from_bytes(data)
        self.program_id = PROGRAM_ID

    def log_decision(self, objective_id: str, observations: list, action_plan: dict) -> str:
        # 1. Compute Hash (PoD)
        payload = {
            "observations": observations,
            "action_plan": action_plan
        }
        payload_str = json.dumps(payload, sort_keys=True)
        decision_hash = hashlib.sha256(payload_str.encode()).hexdigest()
        
        # 2. Build IX (Log Decision)
        ix = build_log_decision_ix(
            self.program_id,
            self.keypair.pubkey(),
            decision_hash,
            objective_id
        )
        
        # 3. Send Transaction
        latest_blockhash = self.client.get_latest_blockhash().value.blockhash
        tx = Transaction.new_signed_with_payer(
            [ix],
            self.keypair.pubkey(),
            [self.keypair],
            latest_blockhash
        )
        
        print(f"📦 Sending Tx for Objective: {objective_id} (Hash: {decision_hash[:8]})...")
        sig = self.client.send_transaction(tx)
        
        return str(sig.value)

def main():
    print("🛡️  Logos Compliance Demo 🛡️")
    print("============================")

    # 1. Initialize Logos Agent
    client = Client("https://api.devnet.solana.com")
    
    # Locate keypair
    keypair_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "id.json")
    if not os.path.exists(keypair_path):
        print("❌ id.json not found for signing.")
        return

    agent = LogosAgentWrapper(client, keypair_path)
    print(f"🤖 Agent: {agent.keypair.pubkey()}")

    # 2. Initialize Compliance Provider
    regtech = ComplianceProvider("Beon_Compliance_Oracle")

    # 3. Simulate Scenarios
    scenarios = [
        {"recipient": "GoodUserAddr", "amount": 50, "desc": "Normal Transfer"},
        {"recipient": "EvilHackerAddress123", "amount": 10, "desc": "Sanctioned Entity"},
        {"recipient": "WhaleUserAddr", "amount": 5000, "desc": "High Value (AML Risk)"}
    ]

    for i, scen in enumerate(scenarios):
        print(f"\n--- Scenario {i+1}: {scen['desc']} ---")
        
        # Step A: Pre-Check
        check_result = regtech.check_transaction(scen)
        
        # Step B: Log Decision to Logos
        # We assume the agent decides to PROCEED or ABORT based on the check.
        
        action = "EXECUTE_TRANSFER" if check_result["passed"] else "ABORT_TRANSFER"
        
        print(f"📝 Logging decision: {action}")
        
        try:
            tx_sig = agent.log_decision(
                objective_id=f"COMP_TEST_{int(time.time())}_{i}", # Unique ID
                observations=[{
                    "source": "compliance_oracle",
                    "data": check_result,
                    "timestamp": time.time()
                }],
                action_plan={
                    "action": action,
                    "target": scen["recipient"],
                    "amount": scen["amount"],
                    "compliance_proof": check_result.get("proof_hash", "N/A")
                }
            )
            print(f"✅ Decision Logged on Solana: https://explorer.solana.com/tx/{tx_sig}?cluster=devnet")
            
            if check_result["passed"]:
                print("🚀 Executing Transfer... (Mock)")
            else:
                print("⛔ Transfer Aborted.")
                
            # Wait a bit to avoid rate limits
            time.sleep(2)
                
        except Exception as e:
            print(f"❌ Logging Failed: {e}")
            # If agent not registered, we should register it.
            # But assuming it's already registered from previous days.

    print("\n✨ Compliance Audit Trail Generated!")

if __name__ == "__main__":
    main()
