import { Connection, PublicKey } from '@solana/web3.js';
export interface LogosConfig {
    connection: Connection;
    wallet: any;
    programId?: string;
}
export interface Decision {
    objectiveId: string;
    observations: Record<string, any>[];
    actionPlan: Record<string, any>;
    dryRun?: boolean;
}
export declare class LogosAgent {
    private connection;
    private wallet;
    private programId;
    constructor(config: LogosConfig);
    /**
     * Calculate the State PDA for the agent
     */
    getAgentPda(agentPubkey: PublicKey): PublicKey;
    /**
     * Log a decision to the Logos program.
     * Auto-registers agent if needed (TODO).
     */
    logDecision(decision: Decision): Promise<string>;
    /**
     * Helper: Log a swap decision (AgentDEX style)
     */
    logSwapDecision(params: {
        inputMint: string;
        outputMint: string;
        amount: number;
        reason: string;
        marketData?: any;
    }): Promise<string>;
}
//# sourceMappingURL=index.d.ts.map