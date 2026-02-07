import axios from 'axios';
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

/**
 * Logos SDK for TypeScript (Updated for Day 5 Canonical Program & Privacy-Aware Memo)
 * Provides "Proof of Decision" logging on Solana with privacy controls.
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

        // Serialize: Discriminator + Hash (String) + ObjectiveID (String)
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

        // Add Memo (Privacy Focused - minimal info)
        // We do NOT log full observations/actionPlan here.
        const memoObj: any = {
            v: 1,
            type: "logos_log",
            oid: decision.objectiveId,
            hash: decisionHash.substring(0, 16) + "..." // Short hash for visibility
        };

        if (options?.publicNote) {
            memoObj.note = options.publicNote;
        }

        const memoIx = new TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(JSON.stringify(memoObj), 'utf-8')
        });

        return await this.sendTransaction([logIx, memoIx]);
    }

    /**
     * AgentBets Integration: Place a bet and commit the reasoning in a single atomic transaction.
     * This provides "Skin in the Game" - prove you put money where your mouth is.
     */
    async buyAndCommit(
        marketId: string,
        outcomeIndex: number,
        amountSol: number,
        reason: string,
        objectiveId: string = "AGENTBETS_PREDICTION",
        options: { apiBase?: string } = {}
    ): Promise<{ signature: string, decisionHash: string }> {
        const apiBase = options.apiBase || "https://agentbets-api-production.up.railway.app";
        const authority = this.authority;

        // 1. Get Unsigned Bet Transaction from AgentBets API
        console.log(`Logos: Fetching bet tx for market ${marketId}...`);
        const response = await axios.post(`${apiBase}/markets/${marketId}/bet`, {
            buyerPubkey: authority.toBase58(),
            outcomeIndex,
            amount: amountSol
        });

        const { unsignedTx: txBase64, message } = response.data as any;
        if (!txBase64) throw new Error("Failed to get transaction from AgentBets API: " + JSON.stringify(response.data));

        // 2. Deserialize Transaction (Legacy Only for now)
        const txBuffer = Buffer.from(txBase64, 'base64');
        let tx: Transaction;
        try {
            tx = Transaction.from(txBuffer);
        } catch (e) {
            throw new Error(`Transaction deserialize failed. AgentBets response might be VersionedTransaction which is not fully supported yet in this atomic flow. Error: ${e}`);
        }

        // 3. Create Logos Decision & Log Instruction
        const decisionData = {
            objectiveId,
            observations: [{ marketId, outcomeIndex, amountSol }],
            actionPlan: {
                action: "BET",
                reason,
                platform: "AgentBets"
            },
            dryRun: false
        };

        const decisionString = JSON.stringify({
            observations: decisionData.observations,
            action_plan: decisionData.actionPlan
        });
        const decisionHash = crypto.createHash('sha256').update(decisionString).digest('hex');

        // --- Create Log Instruction ---
        const hashBuf = Buffer.from(decisionHash, 'utf8');
        const objIdBuf = Buffer.from(objectiveId, 'utf8');

        const dataSize = 8 + (4 + hashBuf.length) + (4 + objIdBuf.length);
        const data = Buffer.alloc(dataSize);
        let offset = 0;
        DISCRIMINATOR_LOG.copy(data, offset); offset += 8;
        data.writeUInt32LE(hashBuf.length, offset); offset += 4;
        hashBuf.copy(data, offset); offset += hashBuf.length;
        data.writeUInt32LE(objIdBuf.length, offset); offset += 4;
        objIdBuf.copy(data, offset); offset += objIdBuf.length;

        const agentPda = this.getAgentPda(authority);
        const decisionPda = this.getDecisionPda(agentPda, objectiveId);

        const logIx = new TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: decisionPda, isSigner: false, isWritable: true },
                { pubkey: agentPda, isSigner: false, isWritable: true },
                { pubkey: authority, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data
        });

        // Add Log Instruction to the Bet Transaction
        // Important: Add BEFORE Memo so Memo describes the whole action? Or AFTER? Order doesn't strictly matter for Atomicity.
        tx.add(logIx);

        // 4. Add Memo
        const memoIx = new TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(JSON.stringify({
                v: 1,
                type: "logos_bet",
                market: marketId,
                outcome: outcomeIndex,
                reason: reason.slice(0, 50) // Short reason in memo
            }), 'utf-8')
        });
        tx.add(memoIx);

        // 5. Sign and Send
        console.log("Logos: Signing atomic transaction...");

        // Ensure recent blockhash is fresh enough (API might have fetched it a second ago, usually fine)
        // If needed: 
        // const { blockhash } = await this.connection.getLatestBlockhash();
        // tx.recentBlockhash = blockhash;

        this.connection = this.connection || new Connection("https://api.devnet.solana.com", "confirmed");

        let signature: string;

        if ('secretKey' in this.wallet) {
            // Re-sign with payer
            signature = await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
        } else if (typeof this.wallet.signTransaction === 'function') {
            const signedTx = await this.wallet.signTransaction(tx);
            signature = await this.connection.sendRawTransaction(signedTx.serialize());
            const latestBlockhash = await this.connection.getLatestBlockhash();
            await this.connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            });
        } else {
            throw new Error("Wallet not supported for signing");
        }

        return { signature, decisionHash };
    }

    /**
     * Commit a secret (prediction) on-chain without revealing the content.
     * Used for "Commit-Reveal" schemes in Prediction Markets.
     * 
     * @param data The data (e.g. prediction JSON) to commit.
     * @param topicId A unique identifier for the event/topic.
     * @param options salt (optional), publicNote (optional)
     * @returns signature, salt, commitment
     */
    async commit(data: any, topicId: string, options?: { salt?: string, dryRun?: boolean, publicNote?: string }): Promise<{ signature: string, salt: string, commitment: string }> {
        const salt = options?.salt || crypto.randomBytes(16).toString('hex');

        // Commitment = SHA256(JSON(data) + salt)
        const dataStr = JSON.stringify(data, Object.keys(data).sort());
        const commitment = crypto.createHash('sha256').update(dataStr + salt).digest('hex');

        if (options?.dryRun) {
            return { signature: `dry_run:${commitment}`, salt, commitment };
        }

        // Log to Logos Program (PoD) + Memo
        // We use "COMMIT:<topicId>" as objectiveId
        const objectiveId = `COMMIT:${topicId}`;

        const decision: Decision = {
            objectiveId,
            observations: [],
            actionPlan: {
                action: "COMMIT",
                commitment_hash: commitment
            }
        };

        const tx = await this.logDecision(decision, {
            publicNote: options?.publicNote || `Commitment for ${topicId}`
        });

        return { signature: tx, salt, commitment };
    }

    /**
     * Reveal a previously committed secret.
     * This logs the full data and salt on-chain, proving the prediction was made earlier.
     * 
     * @param data The original data.
     * @param topicId The same topicId used in commit.
     * @param salt The salt returned from commit().
     */
    async reveal(data: any, topicId: string, salt: string, options?: { dryRun?: boolean }): Promise<{ signature: string, commitment: string }> {
        // 1. Re-calculate commitment
        const dataStr = JSON.stringify(data, Object.keys(data).sort());
        const commitment = crypto.createHash('sha256').update(dataStr + salt).digest('hex');

        const objectiveId = `REVEAL:${topicId}`;

        const decision: Decision = {
            objectiveId,
            observations: [],
            actionPlan: {
                action: "REVEAL",
                // We log the fact that we revealed, but data stays off-chain (or in Memo/IPFS if needed)
                verified_commitment: commitment
            },
            dryRun: options?.dryRun
        };

        // In the Memo, we reveal the SALT. 
        // Verifiers need: Data (from off-chain source) + Salt (from on-chain Memo) -> Hash (on-chain Commit)
        const memoNote = `REVEAL:${topicId} Salt:${salt} Hash:${commitment.substring(0, 8)}...`;

        const tx = await this.logDecision(decision, {
            publicNote: memoNote
        });

        return { signature: tx, commitment };
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
            // Send raw transaction
            const signature = await this.connection.sendRawTransaction(signedTx.serialize());
            // Wait for confirmation
            const latestBlockhash = await this.connection.getLatestBlockhash();
            await this.connection.confirmTransaction({
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
            });
            return signature;
        } else {
            throw new Error("Wallet not supported");
        }
    }
}
