import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

/**
 * Logos SDK for TypeScript
 * Provides "Proof of Decision" logging on Solana.
 */

// Constants
const PROGRAM_ID_DEVNET = "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3";

// Anchor Discriminators (Sighash)
const DISCRIMINATOR_REGISTER = Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);
const DISCRIMINATOR_LOG = Buffer.from([160, 73, 104, 176, 37, 115, 231, 204]);

export interface LogosConfig {
    connection: Connection;
    wallet: any; // Adapter for Wallet (e.g., Anchor Wallet or Keypair)
    programId?: string;
}

export interface Decision {
    objectiveId: string;
    observations: Record<string, any>[];
    actionPlan: Record<string, any>;
    dryRun?: boolean;
}

export class LogosAgent {
    private connection: Connection;
    private wallet: any;
    private programId: PublicKey;

    constructor(config: LogosConfig) {
        this.connection = config.connection;
        this.wallet = config.wallet;
        this.programId = new PublicKey(config.programId || PROGRAM_ID_DEVNET);
    }

    /**
     * Calculate the State PDA for the agent
     */
    getAgentPda(agentPubkey: PublicKey): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent_state"), agentPubkey.toBuffer()],
            this.programId
        );
        return pda;
    }

    /**
     * Log a decision to the Logos program.
     * Auto-registers agent if needed (TODO).
     */
    async logDecision(decision: Decision): Promise<string> {
        // 1. Hash the decision data (Proof of Decision)
        const decisionString = JSON.stringify({
            observations: decision.observations,
            action_plan: decision.actionPlan
        });

        const decisionHash = crypto.createHash('sha256').update(decisionString).digest('hex');
        console.log(`Logos: Generated Decision Hash: ${decisionHash}`);

        if (decision.dryRun) {
            return `dry_run:${decisionHash}`;
        }

        // 2. Build Instruction Data
        // Layout: [Discriminator(8), ObjectiveId(String), DecisionHash(String)]
        // String serialization: [len(4), bytes...]
        const objectiveIdBuf = Buffer.from(decision.objectiveId, 'utf8');
        const decisionHashBuf = Buffer.from(decisionHash, 'utf8');

        const dataSize = 8 + (4 + objectiveIdBuf.length) + (4 + decisionHashBuf.length);
        const data = Buffer.alloc(dataSize);

        let offset = 0;
        // Discriminator
        DISCRIMINATOR_LOG.copy(data, offset);
        offset += 8;

        // Objective ID
        data.writeUInt32LE(objectiveIdBuf.length, offset);
        offset += 4;
        objectiveIdBuf.copy(data, offset);
        offset += objectiveIdBuf.length;

        // Decision Hash
        data.writeUInt32LE(decisionHashBuf.length, offset);
        offset += 4;
        decisionHashBuf.copy(data, offset);
        offset += decisionHashBuf.length;

        // 3. Build Transaction
        const agentPubkey = this.wallet.publicKey;
        const agentPda = this.getAgentPda(agentPubkey);

        const ix = new TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: agentPda, isSigner: false, isWritable: true },
                { pubkey: agentPubkey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: data
        });

        const tx = new Transaction().add(ix);

        // 4. Sign and Send (Abstracted)
        // Assuming wallet has signTransaction or we use sendAndConfirm
        // This part depends on the wallet adapter interface.
        // For now, simpler to just return the built transaction or implement rudimentary sending.

        // NOTE: In a real SDK, we'd handle signing properly.
        // Here we assume `wallet` is compatible with @solana/wallet-adapter or similar.

        tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
        tx.feePayer = agentPubkey;

        const signedTx = await this.wallet.signTransaction(tx);
        const txId = await this.connection.sendRawTransaction(signedTx.serialize());

        console.log(`Logos: Transaction sent: ${txId}`);
        return txId;
    }

    /**
     * Helper: Log a swap decision (AgentDEX style)
     */
    async logSwapDecision(params: {
        inputMint: string;
        outputMint: string;
        amount: number;
        reason: string;
        marketData?: any;
    }): Promise<string> {
        return this.logDecision({
            objectiveId: "SWAP_EXECUTION",
            observations: [{
                type: "market_snapshot",
                data: params.marketData || {},
                timestamp: Date.now()
            }],
            actionPlan: {
                action: "swap",
                input: params.inputMint,
                output: params.outputMint,
                amount: params.amount,
                reason: params.reason
            }
        });
    }
}
