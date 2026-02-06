import hashlib
import time

class ComplianceProvider:
    def __init__(self, name="RegTech_Global_Inc"):
        self.name = name
        self.blacklist = ["EvilHackerAddress123", "SanctionedEntityXYZ"]

    def check_transaction(self, tx_data):
        """
        Simulates a compliance check.
        Returns a signed 'certificate' (mock signature).
        """
        recipient = tx_data.get("recipient")
        amount = tx_data.get("amount", 0)

        print(f"[{self.name}] Checking transaction to {recipient} ({amount} SOL)...")
        time.sleep(1) # Simulate API latency

        # Rule 1: Blacklist
        if recipient in self.blacklist:
            print(f"[{self.name}] ❌ BLOCKED: Recipient is sanctioned.")
            return {
                "passed": False,
                "reason": "SANCTIONED_ADDRESS",
                "timestamp": int(time.time())
            }

        # Rule 2: High Value AML
        if amount > 1000:
            print(f"[{self.name}] ⚠️  FLAGGED: Large transfer requires manual review.")
            return {
                "passed": False,
                "reason": "AML_LIMIT_EXCEEDED",
                "timestamp": int(time.time())
            }

        print(f"[{self.name}] ✅ APPROVED.")
        
        # Create a mock signature/proof
        proof_data = f"{recipient}:{amount}:{self.name}:PASSED"
        proof_hash = hashlib.sha256(proof_data.encode()).hexdigest()
        
        return {
            "passed": True,
            "provider": self.name,
            "proof_hash": proof_hash,
            "timestamp": int(time.time())
        }
