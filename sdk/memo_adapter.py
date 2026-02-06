from solana.transaction import Transaction
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.keypair import Keypair
import json
import base64

MEMO_PROGRAM_ID = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb")

class MemoAdapter:
    def __init__(self, rpc_url: str, keypair_path: str):
        self.client = Client(rpc_url)
        with open(keypair_path, 'r') as f:
            secret = json.load(f)
        self.payer = Keypair.from_bytes(bytes(secret))

    def log_decision(self, objective_id: str, decision_hash: str) -> str:
        """
        Log a decision hash to the Solana Devnet using the Memo Program.
        Payload Format: "LOGOS:v1:{objective_id}:{decision_hash}"
        """
        
        # 1. Create Memo Payload
        payload = f"LOGOS:v1:{objective_id}:{decision_hash}"
        memo_bytes = payload.encode("utf-8")
        
        # 2. Build Memo Instruction
        memo_ix = Instruction(
            program_id=MEMO_PROGRAM_ID,
            accounts=[
                AccountMeta(pubkey=self.payer.pubkey(), is_signer=True, is_writable=True)
            ],
            data=memo_bytes
        )
        
        # 3. Create Transaction
        recent_blockhash = self.client.get_latest_blockhash().value.blockhash
        tx = Transaction(recent_blockhash=recent_blockhash, fee_payer=self.payer.pubkey())
        tx.add(memo_ix)
        tx.sign(self.payer)
        
        # 4. Send Transaction
        try:
            result = self.client.send_transaction(tx, self.payer)
            return str(result.value)
        except Exception as e:
            print(f"Error sending transaction: {e}")
            return None

if __name__ == "__main__":
    # Test
    adapter = MemoAdapter("https://api.devnet.solana.com", "./id.json")
    sig = adapter.log_decision("TEST-OBJ-001", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    print(f"✅ Logged to Devnet! Signature: {sig}")
    print(f"🔗 View: https://explorer.solana.com/tx/{sig}?cluster=devnet")
