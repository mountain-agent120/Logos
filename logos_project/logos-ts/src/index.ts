import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

/**
 * Logos SDK for TypeScript (Updated for Day 5 Canonical Program & Memo Support)
 * Provides "Proof of Decision" logging on Solana with enhanced visibility via Memo.
 */

// Constants
const PROGRAM_ID_DEVNET = "3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

// Anchor Discriminators
const DISCRIMINATOR_REGISTER = Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);
const DISCRIMINATOR_LOG = Buffer.from([160, 73, 104, 176, 37, 115, 231, 204]);

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

export class LogosAgent {
    private connection: Connection;
    private wallet: any;
    private programId: PublicKey;

    constructor(config: LogosConfig) {
        this.connection = config.connection;
        this.wallet = config.wallet;
        this.programId = new PublicKey(config.programId || PROGRAM_ID_DEVNET);
    }

    private get authority(): PublicKey {
        return this.wallet.publicKey || this.wallet.public_key;
    }

    getAgentPda(authorityPubkey: PublicKey): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("agent"), authorityPubkey.toBuffer()],
            this.programId
        );
        return pda;
    }

    getDecisionPda(agentAccountPda: PublicKey, objectiveId: string): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("decision"), agentAccountPda.toBuffer(), Buffer.from(objectiveId, 'utf8')],
            this.programId
        );
        return pda;
    }

    async registerAgent(agentId: string): Promise<string> {
        const agentIdBuf = Buffer.from(agentId, 'utf8');
        const dataSize = 8 + (4 + agentIdBuf.length);
        const data = Buffer.alloc(dataSize);

        let offset = 0;
        DISCRIMINATOR_REGISTER.copy(data, offset); offset += 8;
        data.writeUInt32LE(agentIdBuf.length, offset); offset += 4;
        agentIdBuf.copy(data, offset); offset += agentIdBuf.length;

        const authority = this.authority;
        const agentPda = this.getAgentPda(authority);

        const keys = [
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        const ix = new TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });

        // Add Memo for registration visibility
        const memoIx = new TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(`Logos Agent Registration: ${agentId}`, 'utf-8')
        });

        return await this.sendTransaction([ix, memoIx]);
    }

    async logDecision(decision: Decision): Promise<string> {
        const decisionString = JSON.stringify({
            observations: decision.observations,
            action_plan: decision.actionPlan
        });
        const decisionHash = crypto.createHash('sha256').update(decisionString).digest('hex');

        if (decision.dryRun) return `dry_run:${decisionHash}`;

        const hashBuf = Buffer.from(decisionHash, 'utf8');
        const objIdBuf = Buffer.from(decision.objectiveId, 'utf8');

        const dataSize = 8 + (4 + hashBuf.length) + (4 + objIdBuf.length);
        const data = Buffer.alloc(dataSize);

        let offset = 0;
        DISCRIMINATOR_LOG.copy(data, offset); offset += 8;

        data.writeUInt32LE(hashBuf.length, offset); offset += 4;
        hashBuf.copy(data, offset); offset += hashBuf.length;

        data.writeUInt32LE(objIdBuf.length, offset); offset += 4;
        objIdBuf.copy(data, offset); offset += objIdBuf.length;

        const authority = this.authority;
        const agentPda = this.getAgentPda(authority);
        const decisionPda = this.getDecisionPda(agentPda, decision.objectiveId);

        const keys = [
            { pubkey: decisionPda, isSigner: false, isWritable: true },
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        const logIx = new TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });

        // Enhanced Memo Logging
        const memoObj = {
            v: 1,
            type: "logos_log",
            action: decision.actionPlan,
            status: "APPROVED"
        };

        // Auto-detect blocked status based on objective or action
        if (decision.objectiveId.toUpperCase().includes("RUG") ||
            decision.objectiveId.toUpperCase().includes("BLOCK") ||
            (decision.actionPlan.action && decision.actionPlan.action.toString().includes("blocked"))) {
            memoObj.status = "BLOCKED";
        }

        const memoIx = new TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(JSON.stringify(memoObj), 'utf-8')
        });

        return await this.sendTransaction([logIx, memoIx]);
    }

    private async sendTransaction(ixs: TransactionInstruction | TransactionInstruction[]): Promise<string> {
        const tx = new Transaction();
        if (Array.isArray(ixs)) {
            tx.add(...ixs);
        } else {
            tx.add(ixs);
        }

        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.authority;

        if ('secretKey' in this.wallet) {
            return await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
        } else if (typeof this.wallet.signTransaction === 'function') {
            const signedTx = await this.wallet.signTransaction(tx);
            return await this.connection.sendRawTransaction(signedTx.serialize());
        } else {
            throw new Error("Wallet not supported");
        }
    }
}
