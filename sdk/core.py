import hashlib
import json
import time
from typing import Dict, Any, Optional, Union, List
from dataclasses import dataclass, asdict

@dataclass
class DecisionSnapshot:
    """
    Captures the context of a decision: what was seen and what was done.
    """
    observation_hash: str     # Hash of the input data/context
    action_payload: Dict[str, Any] # The actual action taken

@dataclass
class DecisionRecord:
    """
    Represents a sealed decision made by an agent.
    This replaces the concept of 'ThoughtNode'.
    We log: Context + Action + Objective.
    We do NOT log: Internal Reasoning (CoT).
    """
    agent_id: str
    timestamp: float
    objective_id: str         # The specific policy/goal ID this decision serves
    snapshot: DecisionSnapshot
    prev_hash: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        # Helper to convert nested dataclasses to dict
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True, separators=(',', ':'))

    def compute_hash(self) -> str:
        """Computes the SHA-256 hash of the Decision Record (Proof of Decision)."""
        encoded = self.to_json().encode('utf-8')
        return hashlib.sha256(encoded).hexdigest()

class LogosAgent:
    """
    A wrapper for any AI agent that implements the 'Logos Flight Recorder' pattern.
    """
    def __init__(self, agent_id: str, objective_id: str):
        self.agent_id = agent_id
        self.objective_id = objective_id
        self.history = []
        self.last_hash = None

    def decide(self, observation: Union[Dict[str, Any], List[Dict[str, Any]]], action: Dict[str, Any]) -> str:
        """
        Commits a decision to the log.
        Supports single observation or a batch of observations (e.g. multi-protocol states).
        Returns the Decision Hash (PoD).
        """
        # 1. Provide Privacy by hashing the raw observation first
        # Handles both single dict and list of dicts automatically via JSON serialization
        obs_str = json.dumps(observation, sort_keys=True).encode('utf-8')
        obs_hash = hashlib.sha256(obs_str).hexdigest()

        # 2. Create the snapshot
        snapshot = DecisionSnapshot(
            observation_hash=obs_hash,
            action_payload=action
        )

        # 3. Create the record
        record = DecisionRecord(
            agent_id=self.agent_id,
            timestamp=time.time(),
            objective_id=self.objective_id,
            snapshot=snapshot,
            prev_hash=self.last_hash
        )
        
        # 4. Compute Proof of Decision
        decision_hash = record.compute_hash()
        
        # 5. Update state
        self.history.append(record)
        self.last_hash = decision_hash
        
        print(f"[{self.agent_id}] Decision Logged: {decision_hash[:8]}... | Obj: {self.objective_id}")
        return decision_hash

    def export_logs(self) -> str:
        return json.dumps([n.to_dict() for n in self.history], indent=2)
