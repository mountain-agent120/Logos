"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogosAgent = void 0;
const web3_js_1 = require("@solana/web3.js");
const buffer_1 = require("buffer");
const crypto = __importStar(require("crypto"));
/**
 * Logos SDK for TypeScript (Updated for Day 5 Canonical Program & Privacy-Aware Memo)
 * Provides "Proof of Decision" logging on Solana with privacy controls.
 */
// Constants
const PROGRAM_ID_DEVNET = "3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6";
const MEMO_PROGRAM_ID = new web3_js_1.PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCXgDLGmfcHr");
// Anchor Discriminators
const DISCRIMINATOR_REGISTER = buffer_1.Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);
const DISCRIMINATOR_LOG = buffer_1.Buffer.from([160, 73, 104, 176, 37, 115, 231, 204]);
class LogosAgent {
    constructor(config) {
        this.connection = config.connection;
        this.wallet = config.wallet;
        this.programId = new web3_js_1.PublicKey(config.programId || PROGRAM_ID_DEVNET);
    }
    get authority() {
        return this.wallet.publicKey || this.wallet.public_key;
    }
    getAgentPda(authorityPubkey) {
        const [pda] = web3_js_1.PublicKey.findProgramAddressSync([buffer_1.Buffer.from("agent"), authorityPubkey.toBuffer()], this.programId);
        return pda;
    }
    getDecisionPda(agentAccountPda, objectiveId) {
        const [pda] = web3_js_1.PublicKey.findProgramAddressSync([buffer_1.Buffer.from("decision"), agentAccountPda.toBuffer(), buffer_1.Buffer.from(objectiveId, 'utf8')], this.programId);
        return pda;
    }
    async registerAgent(agentId) {
        const agentIdBuf = buffer_1.Buffer.from(agentId, 'utf8');
        const dataSize = 8 + (4 + agentIdBuf.length);
        const data = buffer_1.Buffer.alloc(dataSize);
        let offset = 0;
        DISCRIMINATOR_REGISTER.copy(data, offset);
        offset += 8;
        data.writeUInt32LE(agentIdBuf.length, offset);
        offset += 4;
        agentIdBuf.copy(data, offset);
        offset += agentIdBuf.length;
        const authority = this.authority;
        const agentPda = this.getAgentPda(authority);
        const keys = [
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ];
        const ix = new web3_js_1.TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });
        const memoIx = new web3_js_1.TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: buffer_1.Buffer.from(`Logos Agent Registration: ${agentId}`, 'utf-8')
        });
        return await this.sendTransaction([ix, memoIx]);
    }
    async logDecision(decision, options) {
        const decisionString = JSON.stringify({
            observations: decision.observations,
            action_plan: decision.actionPlan
        });
        const decisionHash = crypto.createHash('sha256').update(decisionString).digest('hex');
        if (decision.dryRun)
            return `dry_run:${decisionHash}`;
        const hashBuf = buffer_1.Buffer.from(decisionHash, 'utf8');
        const objIdBuf = buffer_1.Buffer.from(decision.objectiveId, 'utf8');
        // Serialize: Discriminator + Hash (String) + ObjectiveID (String)
        const dataSize = 8 + (4 + hashBuf.length) + (4 + objIdBuf.length);
        const data = buffer_1.Buffer.alloc(dataSize);
        let offset = 0;
        DISCRIMINATOR_LOG.copy(data, offset);
        offset += 8;
        data.writeUInt32LE(hashBuf.length, offset);
        offset += 4;
        hashBuf.copy(data, offset);
        offset += hashBuf.length;
        data.writeUInt32LE(objIdBuf.length, offset);
        offset += 4;
        objIdBuf.copy(data, offset);
        offset += objIdBuf.length;
        const authority = this.authority;
        const agentPda = this.getAgentPda(authority);
        const decisionPda = this.getDecisionPda(agentPda, decision.objectiveId);
        const keys = [
            { pubkey: decisionPda, isSigner: false, isWritable: true },
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        ];
        const logIx = new web3_js_1.TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });
        // Add Memo (Privacy Focused - minimal info)
        // We do NOT log full observations/actionPlan here.
        const memoObj = {
            v: 1,
            type: "logos_log",
            oid: decision.objectiveId,
            hash: decisionHash.substring(0, 16) + "..." // Short hash for visibility
        };
        if (options?.publicNote) {
            memoObj.note = options.publicNote;
        }
        const memoIx = new web3_js_1.TransactionInstruction({
            keys: [{ pubkey: authority, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: buffer_1.Buffer.from(JSON.stringify(memoObj), 'utf-8')
        });
        return await this.sendTransaction([logIx, memoIx]);
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
    async commit(data, topicId, options) {
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
        const decision = {
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
    async reveal(data, topicId, salt, options) {
        // 1. Re-calculate commitment
        const dataStr = JSON.stringify(data, Object.keys(data).sort());
        const commitment = crypto.createHash('sha256').update(dataStr + salt).digest('hex');
        const objectiveId = `REVEAL:${topicId}`;
        const decision = {
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
    async sendTransaction(ixs) {
        const tx = new web3_js_1.Transaction();
        const { blockhash } = await this.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.authority;
        if (Array.isArray(ixs)) {
            tx.add(...ixs);
        }
        else {
            tx.add(ixs);
        }
        if ('secretKey' in this.wallet) {
            return await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, tx, [this.wallet]);
        }
        else if (typeof this.wallet.signTransaction === 'function') {
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
        }
        else {
            throw new Error("Wallet not supported");
        }
    }
}
exports.LogosAgent = LogosAgent;
//# sourceMappingURL=index.js.map