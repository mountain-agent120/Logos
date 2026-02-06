import { Connection, Keypair } from '@solana/web3.js';
import { LogosAgent } from '../index';
import * as fs from 'fs';
import * as path from 'path';

// Config
const RPC_URL = "https://api.devnet.solana.com";
const AUTHORITY_KEY_PATH = path.resolve(__dirname, "../../../keys/authority.json");

async function main() {
    // 1. Load Keypair
    const secret = JSON.parse(fs.readFileSync(AUTHORITY_KEY_PATH, 'utf-8'));
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret));

    console.log(`🔑 Wallet: ${wallet.publicKey.toBase58()}`);

    const connection = new Connection(RPC_URL, "confirmed");

    // 2. Init SDK
    const agent = new LogosAgent({
        connection,
        wallet,
    });

    // 3. Register Agent
    try {
        console.log("📝 Registering Agent...");
        // Use a unique ID to avoid collision or handle error
        const tx = await agent.registerAgent("DemoAgent_" + Date.now().toString().slice(-4));
        console.log(`✅ Registered! TX: ${tx}`);
    } catch (e: any) {
        console.log(`⚠️ Register failed: ${e.message}`);
    }

    // 4. Log Decisions
    console.log("🚀 Logging Demo Decisions...");

    try {
        // 4.1 Safe Trade
        const tx1 = await agent.logDecision({
            objectiveId: "SAFE_TRADE_" + Date.now(), // Unique ID for decision PDA
            observations: [{ type: "price", value: 100 }],
            actionPlan: { action: "swap", amount: 0.1, input: "SOL", output: "USDC" }
        });
        console.log(`✅ Safe Trade Logged: ${tx1}`);

        // 4.2 Rug Pull (Simulated Block)
        const tx2 = await agent.logDecision({
            objectiveId: "RUG_PULL_" + Date.now(),
            observations: [{ type: "balance", value: 10000 }],
            actionPlan: { action: "transfer", amount: 10000, recipient: "BadActor" }
        });
        console.log(`✅ Rug Pull Logged: ${tx2}`);

        console.log("\n🎉 Demo Data Generation Complete!");

    } catch (e: any) {
        console.error(`❌ Logging failed: ${e.message}`);
        // Log details if available
        if ('logs' in e) {
            console.error("Logs:", e.logs);
        }
    }
}

main().catch(console.error);
