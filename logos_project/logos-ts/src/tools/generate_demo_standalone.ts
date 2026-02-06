import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const PROGRAM_ID_DEVNET = "3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6";
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

        return await this.sendTransaction(ix);
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

        const ix = new TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });

        return await this.sendTransaction(ix);
    }

    private async sendTransaction(ix: TransactionInstruction): Promise<string> {
        const tx = new Transaction().add(ix);
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

// Config
const RPC_URL = "https://api.devnet.solana.com";
const AUTHORITY_KEY_PATH = path.resolve(__dirname, "../../../keys/authority.json");

async function main() {
    console.log("🚀 Starting standalone demo...");

    // Load Wallet
    const secret = JSON.parse(fs.readFileSync(AUTHORITY_KEY_PATH, 'utf-8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

    console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}`);

    const connection = new Connection(RPC_URL, "confirmed");
    const agent = new LogosAgent({ connection, wallet });

    // Register
    try {
        console.log("📝 Registering Agent...");
        const tx = await agent.registerAgent("DemoAgent_" + Date.now().toString().slice(-4));
        console.log(`✅ Registered! TX: ${tx}`);
    } catch (e: any) {
        console.log(`⚠️ Register failed: ${e.message}`);
    }

    // Log
    console.log("🚀 Logging Demo Decisions...");
    try {
        const tx1 = await agent.logDecision({
            objectiveId: "SAFE_" + Date.now(),
            observations: [],
            actionPlan: { action: "swap" }
        });
        console.log(`✅ Safe Trade Logged: ${tx1}`);

        const tx2 = await agent.logDecision({
            objectiveId: "RUG_" + Date.now(),
            observations: [],
            actionPlan: { action: "blocked_transfer" }
        });
        console.log(`✅ Rug Pull Logged: ${tx2}`);
    } catch (e: any) {
        console.error(`❌ Logging failed: ${e.message}`);
    }
}

main().catch(console.error);
