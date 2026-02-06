use anchor_lang::prelude::*;

declare_id!("Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3");

#[program]
pub mod logos_core {
    use super::*;

    pub fn register_agent(ctx: Context<RegisterAgent>, agent_id: String) -> Result<()> {
        let agent_account = &mut ctx.accounts.agent_account;
        agent_account.authority = ctx.accounts.authority.key();
        agent_account.agent_id = agent_id.clone();
        agent_account.created_at = Clock::get()?.unix_timestamp;
        
        // Emit event for off-chain indexing
        emit!(AgentRegistered {
            agent: agent_account.key(),
            agent_id: agent_id,
            authority: ctx.accounts.authority.key(),
            timestamp: agent_account.created_at,
        });
        
        msg!("Agent registered: {}", agent_account.agent_id);
        Ok(())
    }

    /// Logs a "Proof of Decision" (PoD)
    /// This stores the commitment (decision_hash) and context (objective_id).
    pub fn log_decision(
        ctx: Context<LogDecision>, 
        decision_hash: String, 
        objective_id: String
    ) -> Result<()> {
        let decision_record = &mut ctx.accounts.decision_record;
        
        // Validation: Ensure hash length is 64 chars (SHA-256 hex)
        require!(decision_hash.len() == 64, LogosError::InvalidHashLength);
        
        decision_record.agent = ctx.accounts.agent_account.key();
        decision_record.decision_hash = decision_hash.clone();
        decision_record.objective_id = objective_id.clone();
        decision_record.timestamp = Clock::get()?.unix_timestamp; // On-chain time is the source of truth
        
        // Emit event for off-chain indexing (Hybrid Storage: Event Log)
        emit!(DecisionLogged {
            agent: decision_record.agent,
            objective_id: objective_id.clone(),
            decision_hash: decision_hash.clone(),
            timestamp: decision_record.timestamp,
        });
        
        msg!("Decision Logged. Obj: {}, Hash: {}", objective_id, decision_record.decision_hash);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        seeds = [b"agent", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + 32 + 50 + 8
    )]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(decision_hash: String, objective_id: String)]
pub struct LogDecision<'info> {
    #[account(
        init,
        seeds = [b"decision", agent_account.key().as_ref(), objective_id.as_bytes()],
        bump,
        payer = authority,
        space = 8 + 32 + 64 + 50 + 8 
    )]
    pub decision_record: Account<'info, DecisionRecord>,
    #[account(mut, has_one = authority)]
    pub agent_account: Account<'info, AgentAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AgentAccount {
    pub authority: Pubkey,
    pub agent_id: String,
    pub created_at: i64,
}

#[account]
pub struct DecisionRecord {
    pub agent: Pubkey,
    pub decision_hash: String, 
    pub objective_id: String,
    pub timestamp: i64,
}

#[error_code]
pub enum LogosError {
    #[msg("Decision hash must be exactly 64 characters.")]
    InvalidHashLength,
}

// ========== Events (for off-chain indexing) ==========

#[event]
pub struct AgentRegistered {
    pub agent: Pubkey,
    pub agent_id: String,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DecisionLogged {
    pub agent: Pubkey,
    pub objective_id: String,
    pub decision_hash: String,
    pub timestamp: i64,
}
