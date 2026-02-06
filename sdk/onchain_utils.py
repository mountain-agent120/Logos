import hashlib
import struct
from typing import List
# from solana.transaction import Transaction
from solders.transaction import Transaction
from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.sysvar import RENT, CLOCK

def get_discriminator(namespace: str, name: str) -> bytes:
    """Calculate Anchor instruction discriminator."""
    preimage = f"{namespace}:{name}".encode("ascii")
    return hashlib.sha256(preimage).digest()[:8]

def build_register_agent_ix(
    program_id: Pubkey,
    authority: Pubkey,
    agent_id: str
) -> Instruction:
    """Build 'register_agent' instruction."""
    
    # 1. Accounts
    # seeds = [b"agent", authority.key().as_ref()]
    agent_pda, bump = Pubkey.find_program_address(
        [b"agent", bytes(authority)],
        program_id
    )
    
    accounts = [
        AccountMeta(pubkey=agent_pda, is_signer=False, is_writable=True),
        AccountMeta(pubkey=authority, is_signer=True, is_writable=True),
        AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
    ]
    
    # 2. Data
    # Discriminator
    discriminator = get_discriminator("global", "register_agent")
    
    # Arguments: agent_id (String)
    # Serialize string: [len(u32) + bytes]
    agent_id_bytes = agent_id.encode("utf-8")
    data = discriminator + struct.pack("<I", len(agent_id_bytes)) + agent_id_bytes
    
    return Instruction(
        program_id=program_id,
        accounts=accounts,
        data=data
    )

def build_log_decision_ix(
    program_id: Pubkey,
    authority: Pubkey,
    decision_hash: str,
    objective_id: str
) -> Instruction:
    """Build 'log_decision' instruction."""
    
    # PDA: seeds = [b"agent", authority]
    agent_pda, _ = Pubkey.find_program_address(
        [b"agent", bytes(authority)],
        program_id
    )
    
    # PDA: seeds = [b"decision", agent_pda, objective_id]
    decision_pda, _ = Pubkey.find_program_address(
        [b"decision", bytes(agent_pda), objective_id.encode("utf-8")],
        program_id
    )
    
    accounts = [
        AccountMeta(pubkey=decision_pda, is_signer=False, is_writable=True),
        AccountMeta(pubkey=agent_pda, is_signer=False, is_writable=True), # mut, has_one=authority
        AccountMeta(pubkey=authority, is_signer=True, is_writable=True),
        AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
    ]
    
    # Data
    discriminator = get_discriminator("global", "log_decision")
    
    # Args: decision_hash (String), objective_id (String)
    dh_bytes = decision_hash.encode("utf-8")
    obj_bytes = objective_id.encode("utf-8")
    
    data = (
        discriminator + 
        struct.pack("<I", len(dh_bytes)) + dh_bytes +
        struct.pack("<I", len(obj_bytes)) + obj_bytes
    )
    
    return Instruction(
        program_id=program_id,
        accounts=accounts,
        data=data
    )
