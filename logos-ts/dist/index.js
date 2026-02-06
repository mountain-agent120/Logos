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
 * Logos SDK for TypeScript
 * Provides "Proof of Decision" logging on Solana.
 */
// Constants
const PROGRAM_ID_DEVNET = "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3";
// Anchor Discriminators (Sighash)
const DISCRIMINATOR_REGISTER = buffer_1.Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);
const DISCRIMINATOR_LOG = buffer_1.Buffer.from([160, 73, 104, 176, 37, 115, 231, 204]);
class LogosAgent {
    constructor(config) {
        this.connection = config.connection;
        this.wallet = config.wallet;
        this.programId = new web3_js_1.PublicKey(config.programId || PROGRAM_ID_DEVNET);
    }
    /**
     * Calculate the State PDA for the agent
     */
    getAgentPda(agentPubkey) {
        const [pda] = web3_js_1.PublicKey.findProgramAddressSync([buffer_1.Buffer.from("agent_state"), agentPubkey.toBuffer()], this.programId);
        return pda;
    }
    /**
     * Log a decision to the Logos program.
     * Auto-registers agent if needed (TODO).
     */
    async logDecision(decision) {
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
        const objectiveIdBuf = buffer_1.Buffer.from(decision.objectiveId, 'utf8');
        const decisionHashBuf = buffer_1.Buffer.from(decisionHash, 'utf8');
        const dataSize = 8 + (4 + objectiveIdBuf.length) + (4 + decisionHashBuf.length);
        const data = buffer_1.Buffer.alloc(dataSize);
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
        const ix = new web3_js_1.TransactionInstruction({
            programId: this.programId,
            keys: [
                { pubkey: agentPda, isSigner: false, isWritable: true },
                { pubkey: agentPubkey, isSigner: true, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: data
        });
        const tx = new web3_js_1.Transaction().add(ix);
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
    async logSwapDecision(params) {
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
exports.LogosAgent = LogosAgent;
//# sourceMappingURL=index.js.map