import { Connection, PublicKey } from '@solana/web3.js';
export interface LogosConfig {
    connection: Connection;
    wallet?: any;
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
    private get authority();
    getAgentPda(authorityPubkey: PublicKey): PublicKey;
    getDecisionPda(agentAccountPda: PublicKey, objectiveId: string): PublicKey;
    registerAgent(agentId: string): Promise<string>;
    logDecision(decision: Decision, options?: {
        publicNote?: string;
    }): Promise<string>;
    /**
     * Commit a secret (prediction) on-chain without revealing the content.
     * Used for "Commit-Reveal" schemes in Prediction Markets.
     *
     * @param data The data (e.g. prediction JSON) to commit.
     * @param topicId A unique identifier for the event/topic.
     * @param options salt (optional), publicNote (optional)
     * @returns signature, salt, commitment
     */
    commit(data: any, topicId: string, options?: {
        salt?: string;
        dryRun?: boolean;
        publicNote?: string;
    }): Promise<{
        signature: string;
        salt: string;
        commitment: string;
    }>;
    /**
     * Reveal a previously committed secret.
     * This logs the full data and salt on-chain, proving the prediction was made earlier.
     *
     * @param data The original data.
     * @param topicId The same topicId used in commit.
     * @param salt The salt returned from commit().
     */
    reveal(data: any, topicId: string, salt: string, options?: {
        dryRun?: boolean;
    }): Promise<{
        signature: string;
        commitment: string;
    }>;
    private sendTransaction;
}
//# sourceMappingURL=index.d.ts.map