from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
import json
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add SDK to path
sys.path.append(os.path.dirname(__file__))

from sdk.core import LogosAgent
from sdk.onchain_utils import build_log_decision_ix
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.types import TxOpts

# Load environment
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Logos Agent API", 
    description="Interface for AI Agents to log verifiable decisions on Solana",
    version="1.0.0"
)

# Configuration
RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3"
KEYPAIR_PATH = os.getenv("SOLANA_KEYPAIR_PATH", "./id.json")

# Initialize Solana client
client = Client(RPC_URL)
program_id = Pubkey.from_string(PROGRAM_ID_STR)

# Load keypair
try:
    with open(KEYPAIR_PATH, 'r') as f:
        secret = json.load(f)
    payer = Keypair.from_bytes(bytes(secret))
except Exception as e:
    print(f"Warning: Could not load keypair from {KEYPAIR_PATH}: {e}")
    payer = None

# --- Data Models ---
class ObservationData(BaseModel):
    source: str
    content: Dict[str, Any]
    timestamp: float

class DecisionRequest(BaseModel):
    objective_id: str
    observations: List[ObservationData]
    action_plan: Dict[str, Any]
    dry_run: bool = False

class DecisionResponse(BaseModel):
    decision_hash: str
    signature: Optional[str] = None
    status: str
    timestamp: str
    explorer_url: Optional[str] = None

# --- Endpoints ---

@app.get("/")
async def root():
    return {
        "status": "active", 
        "service": "Logos Verifiable Decision Logger",
        "version": "1.0.0",
        "program_id": PROGRAM_ID_STR,
        "network": "devnet"
    }

@app.post("/log", response_model=DecisionResponse)
async def log_decision(req: DecisionRequest):
    """
    Log a decision to the Solana blockchain.
    """
    if not payer:
        raise HTTPException(status_code=500, detail="Keypair not configured")
    
    try:
        # 1. Calculate Decision Hash using SDK
        # Use objective_id as agent_id for now (or could be from request)
        agent_id = f"API-Agent-{req.objective_id}"
        agent = LogosAgent(agent_id=agent_id, objective_id=req.objective_id)
        obs_dicts = [o.dict() for o in req.observations]
        decision_hash = agent.decide(obs_dicts, req.action_plan)
        
        signature = None
        if not req.dry_run:
            # 2. Check if agent is registered, if not, register first
            from sdk.onchain_utils import build_register_agent_ix
            from solders.pubkey import Pubkey as SoldersPubkey
            
            agent_pda, _ = SoldersPubkey.find_program_address(
                [b"agent", bytes(payer.pubkey())],
                program_id
            )
            
            # Try to fetch agent account
            try:
                account_info = client.get_account_info(agent_pda)
                agent_exists = account_info.value is not None
            except:
                agent_exists = False
            
            # Register if needed
            if not agent_exists:
                print(f"Agent not registered. Registering {agent_id}...")
                ix_register = build_register_agent_ix(program_id, payer.pubkey(), agent_id)
                latest_blockhash = client.get_latest_blockhash().value.blockhash
                msg_register = Message([ix_register], payer.pubkey())
                tx_register = Transaction([payer], msg_register, latest_blockhash)
                client.send_transaction(tx_register, opts=TxOpts(skip_preflight=False))
                # Wait a bit for confirmation
                import time
                time.sleep(2)
            
            # 3. Build and send decision log transaction
            ix = build_log_decision_ix(
                program_id=program_id,
                authority=payer.pubkey(),
                decision_hash=decision_hash,
                objective_id=req.objective_id
            )
            
            latest_blockhash = client.get_latest_blockhash().value.blockhash
            msg = Message([ix], payer.pubkey())
            tx = Transaction([payer], msg, latest_blockhash)
            
            resp = client.send_transaction(tx, opts=TxOpts(skip_preflight=False))
            signature = str(resp.value)
            
        explorer_url = f"https://explorer.solana.com/tx/{signature}?cluster=devnet" if signature else None
        
        return DecisionResponse(
            decision_hash=decision_hash,
            signature=signature,
            status="committed" if signature else "simulated",
            timestamp=datetime.utcnow().isoformat(),
            explorer_url=explorer_url
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")

@app.get("/verify/{decision_hash}")
async def verify_decision(decision_hash: str):
    """
    Verify if a decision hash exists on-chain.
    """
    # TODO: Query PDA to check if decision exists
    # For now, return placeholder
    return {
        "decision_hash": decision_hash, 
        "verified": False, 
        "message": "PDA query not yet implemented. Check explorer manually."
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        balance = client.get_balance(payer.pubkey()).value if payer else 0
        return {
            "status": "healthy",
            "rpc_url": RPC_URL,
            "program_id": PROGRAM_ID_STR,
            "wallet_balance": balance / 1e9  # Convert lamports to SOL
        }
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

if __name__ == "__main__":
    print(f"🚀 Starting Logos API Server...")
    print(f"   Program ID: {PROGRAM_ID_STR}")
    print(f"   Network: Devnet")
    print(f"   RPC: {RPC_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
