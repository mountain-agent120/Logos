import { Connection, Keypair } from '@solana/web3.js';
import { LogosAgent } from '../dist/index';
import * as fs from 'fs';
import * as path from 'path';

// Debug: Check if LogosAgent is loaded correctly
console.log("LogosAgent loaded:", LogosAgent);

// Load ID.json (Funded by AgentWallet!)
function loadKeypair(filepath: string): Keypair {
    const keyData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(keyData));
}

async function main() {
    console.log("🚀 Starting Prediction Market Commit-Reveal Demo...");

    // 1. Setup Connection & Wallet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const keypairPath = path.resolve(__dirname, '../../id.json');

    if (!fs.existsSync(keypairPath)) {
        console.error("❌ Keypair not found at:", keypairPath);
        process.exit(1);
    }

    const wallet = loadKeypair(keypairPath);
    console.log(`👤 Agent Identity: ${wallet.publicKey.toBase58()}`);

    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${balance / 1e9} SOL (Funded via AgentWallet?)`);

    if (balance < 0.1 * 1e9) {
        console.error("❌ Insufficient funds! Please fund via AgentWallet first.");
        process.exit(1);
    }

    // 2. Initialize Logos Agent
    const agent = new LogosAgent({
        connection,
        wallet,
        programId: "Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3" // Canonical for Day 5
    });

    console.log("DEBUG: Checking agent instance...");
    console.log("DEBUG: agent.commit type =", typeof (agent as any).commit);
    console.log("DEBUG: Prototype methods =", Object.getOwnPropertyNames(Object.getPrototypeOf(agent)));

    try {
        // --- SCENARIO: Predicting SOL Price for Day 6 ---
        const prediction = {
            asset: "SOL",
            target_price_usd: 145.50,
            confidence: 0.85,
            rationale: "Technical breakout on 4H chart + Hackathon momentum"
        };
        const topicId = `PREDICTION-${Date.now()}`;

        console.log("\n🔒 Step 1: Committing Prediction (Hiding Alpha)...");
        console.log("   Topic:", topicId);
        console.log("   Data:", JSON.stringify(prediction));

        // execute commit
        const commitResult = await agent.commit(prediction, topicId);

        console.log("✅ Commit Successful!");
        console.log(`   Signature: https://explorer.solana.com/tx/${commitResult.signature}?cluster=devnet`);
        console.log(`   Commitment Hash: ${commitResult.commitment}`);
        console.log(`   Salt (KEEP SECRET): ${commitResult.salt}`);

        console.log("\n⏳ Simulating time passing... (Wait 5s)");
        await new Promise(r => setTimeout(r, 5000));

        // --- SCENARIO: Event Resolved, Time to Reveal ---
        console.log("\nTvT Amount Step 2: Revealing Prediction (Proving Alpha)...");

        // execute reveal
        const revealResult = await agent.reveal(prediction, topicId, commitResult.salt);

        console.log("✅ Reveal Successful!");
        console.log(`   Signature: https://explorer.solana.com/tx/${revealResult.signature}?cluster=devnet`);
        console.log(`   Verified Commitment: ${revealResult.commitment}`);

        if (revealResult.commitment === commitResult.commitment) {
            console.log("\n🎉 SUCCESS: On-chain proof verified! Commitment matches.");
        } else {
            console.error("\n❌ FAILURE: Commitment mismatch!");
        }

    } catch (err) {
        console.error("❌ Error during demo:", err);
    }
}

main();
