
import { Connection, Keypair } from '@solana/web3.js';
import { LogosAgent } from '../dist/index';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Helper to load keypair from root id.json
function loadKeypair(): Keypair {
    // Try multiple paths
    const paths = [
        path.resolve(__dirname, '../../../id.json'), // From examples/
        path.resolve(__dirname, '../../id.json'),
        path.resolve(process.cwd(), 'id.json')
    ];

    for (const p of paths) {
        if (fs.existsSync(p)) {
            const keyData = JSON.parse(fs.readFileSync(p, 'utf-8'));
            return Keypair.fromSecretKey(new Uint8Array(keyData));
        }
    }
    throw new Error("❌ Keypair id.json not found");
}

async function main() {
    console.log("🚀 Testing Logos + AgentBets Integration...");

    // 1. Setup
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    let wallet;
    try {
        wallet = loadKeypair();
        console.log(`👤 Wallet: ${wallet.publicKey.toBase58()}`);
    } catch (e: any) {
        console.error(e.message);
        process.exit(1);
    }

    const agent = new LogosAgent({ connection, wallet });

    // 2. Fetch Active Market
    console.log("🔍 Finding active market...");
    const apiBase = "https://agentbets-api-production.up.railway.app";
    let marketId = "";

    try {
        const resp = await axios.get(`${apiBase}/markets`) as any;
        const markets = resp.data.markets || resp.data;

        // Find a market that is NOT resolved
        const activeMarket = markets.find((m: any) => !m.resolved);

        if (activeMarket) {
            marketId = activeMarket.marketId || activeMarket.id;
            console.log(`✅ Found active market: ${marketId}`);
            console.log(`   Question: ${activeMarket.question}`);
        } else {
            console.log("⚠️ No active markets found. Using a recent one for test (might fail on-chain)...");
            if (markets.length > 0) marketId = markets[0].marketId || markets[0].id;
        }
    } catch (e: any) {
        console.error("❌ Failed to fetch markets:", e.message);
        return;
    }

    if (!marketId) {
        console.error("❌ No market ID available.");
        return;
    }

    // 3. Register Agent (if needed)
    // The demo script does this, but let's ensure it here too for robustness
    const agentPda = agent.getAgentPda(wallet!.publicKey);
    const agentInfo = await connection.getAccountInfo(agentPda);
    if (!agentInfo) {
        console.log("📝 Registering agent first...");
        await agent.registerAgent("AgentBets-Integration-Test");
        await new Promise(r => setTimeout(r, 2000));
    }

    // 4. Place Bet & Commit Logic
    console.log(`🎲 Betting on Market: ${marketId}`);

    try {
        const result = await agent.buyAndCommit(
            marketId,
            0, // Outcome Index 0 (First option)
            0.001, // 0.001 SOL
            "I believe this agent has strong momentum based on GitHub activity.", // Reason
            `PRED-${Date.now()}` // Objective ID
        );

        console.log("✅ Success! Atomic Transaction Sent.");
        console.log(`🔗 Signature: https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
        console.log(`DOC Decision Hash: ${result.decisionHash}`);

    } catch (e: any) {
        console.error("❌ Transaction Failed:", e.message);
        if (e.response) {
            console.error("API Response:", e.response.data);
        }
    }
}

main();
