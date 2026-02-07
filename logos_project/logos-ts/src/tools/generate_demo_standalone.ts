import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const PROGRAM_ID_DEVNET = "3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

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

        // Add Memo
        const memoIx = new TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(`Logos Agent Registration: ${agentId}`, 'utf-8')
        });

        return await this.sendTransaction([ix, memoIx]);
    }

    async logDecision(decision: Decision, options?: { publicNote?: string }): Promise<string> {
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

        // Privacy-Focused Memo
        const memoObj: any = {
            v: 1,
            type: "logos_log",
            status: "APPROVED",
            note: options?.publicNote || decision.objectiveId
        };

        if (decision.objectiveId.toUpperCase().includes("RUG") ||
            (options?.publicNote?.toUpperCase().includes("BLOCKED"))) {
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
        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.authority;

        if (Array.isArray(ixs)) {
            tx.add(...ixs);
        } else {
            tx.add(ixs);
        }

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

// Config
const RPC_URL = "https://api.devnet.solana.com";
const AUTHORITY_KEY_PATH = path.resolve(__dirname, "../../../keys/authority.json");

async function main() {
    console.log("🚀 Starting standalone demo with PRIVACY-AWARE MEMO support...");

    // Load Wallet
    const secret = JSON.parse(fs.readFileSync(AUTHORITY_KEY_PATH, 'utf-8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

    console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}`);

    const connection = new Connection(RPC_URL, "confirmed");
    const agent = new LogosAgent({ connection, wallet });

    // 4. Log Decisions with Private Memo
    console.log("🚀 Logging Demo Decisions...");

    try {
        const tx1 = await agent.logDecision({
            objectiveId: "SAFE_TRD_" + Date.now().toString().slice(-4),
            observations: [],
            actionPlan: { action: "swap", amount: 0.5, pair: "SOL-USDC", strategy: "Proprietary Alpha V1" }
        }, { publicNote: "Executing Swap 0.5 SOL -> USDC via Jupiter" });
        console.log(`✅ Safe Trade Logged (Public Note only): ${tx1}`);

        // Rug Pull (Blocked)
        const tx2 = await agent.logDecision({
            objectiveId: "RUG_PULL_" + Date.now().toString().slice(-4),
            observations: [],
            actionPlan: { action: "blocked_transfer", amount: 10000, recipient: "BadActor" }
        }, { publicNote: "BLOCKED: Activity exceeds volume limit (Treasury Protection)" });
        console.log(`✅ Rug Pull Logged (Public Note only): ${tx2}`);

    } catch (e: any) {
        console.error(`❌ Logging failed: ${e.message}`);
    }
}

main().catch(console.error);
