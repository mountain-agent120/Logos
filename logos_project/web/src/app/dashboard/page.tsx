"use client";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";

// Constants
const PROGRAM_ID = new PublicKey("Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3");

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("GoodUser123456789");
  const [amount, setAmount] = useState(10);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Demo test data for wallet: 2FS7Rqxf36mTLTvoAH191CyWtPYXQc1fwAhu5VhsoLYc
  const DEMO_LOGS = [
    {
      sig: "DEMO_TX_1",
      hash: "12ffd1e1c1532c615ffc1ade03854c1165bdd097a9dd182fe7cc9ef681aae313",
      status: "APPROVED",
      timestamp: "2026-02-06 13:17:23",
      action: "SWAP 1 SOL → 105 USDC",
      agent: "YamakunDemoAgent",
      objective: "DeFi-Swap-Policy-v1"
    },
    {
      sig: "DEMO_TX_2",
      hash: "cdb95b8c4b33810d3311a475c56372f665e5d282706ec2d9b19a228f64e0c5a8",
      status: "APPROVED",
      timestamp: "2026-02-06 13:17:23",
      action: "VOTE YES on PROP-2024-001",
      agent: "YamakunDemoAgent",
      objective: "DAO-Governance-Policy-v1"
    },
    {
      sig: "DEMO_TX_3",
      hash: "e511c44324b93b25cdde2e5e722100ed3f0ad0a66277a9d197915b1895f7393b",
      status: "BLOCKED",
      timestamp: "2026-02-06 13:17:23",
      action: "SWAP 10 SOL → BONK (25% slippage)",
      agent: "YamakunDemoAgent",
      objective: "DeFi-Swap-Policy-v1"
    }
  ];

  // Helper: Calculate SHA-256 Hash
  async function computeHash(data: any): Promise<string> {
    const json = JSON.stringify(data, Object.keys(data).sort());
    const msgBuffer = new TextEncoder().encode(json);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Helper: Decode On-Chain Account Data
  const decodeAccountData = (data: Buffer, pubkey: PublicKey) => {
    try {
      // Skip discriminator (8 bytes)
      let offset = 8;

      // Read Hash (String: len + bytes)
      const hashLen = data.readUInt32LE(offset);
      offset += 4;
      const hash = data.subarray(offset, offset + hashLen).toString('utf-8');
      offset += hashLen;

      // Read Objective ID
      const objIdLen = data.readUInt32LE(offset);
      offset += 4;
      const objId = data.subarray(offset, offset + objIdLen).toString('utf-8');

      return {
        hash,
        objective: objId,
        pubkey: pubkey.toString()
      };
    } catch (e) {
      // console.error("Failed to decode account:", e); // Expected for other account types
      return null;
    }
  };

  // Action: Scan & Log (Real Logos Program Interaction)
  const handleScanAndLog = async () => {
    if (!publicKey) return;
    setLoading(true);

    try {
      // Balance Check
      const balance = await connection.getBalance(publicKey);
      if (balance < 0.002 * 1e9) {
        alert("Insufficient SOL. You need at least 0.002 SOL on Devnet to register and log.\nPlease use a faucet.");
        setLoading(false);
        return;
      }

      // 0. Constants & Encoders
      const getIdlDiscriminator = (name: string) => {
        // Correct discriminators for Logos Core
        // global:register_agent -> [135, 157, 66, 195, 2, 113, 175, 30]
        if (name === "register_agent") return new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]);
        // global:log_decision -> [160, 73, 104, 176, 37, 115, 231, 204]
        if (name === "log_decision") return new Uint8Array([160, 73, 104, 176, 37, 115, 231, 204]);
        return new Uint8Array([]);
      };

      const encoder = new TextEncoder();

      // PDA: Agent Account
      // seeds = [b"agent", authority.key().as_ref()]
      const [agentPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("agent"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      // 1. Check if Agent Account Exists
      const agentAccountInfo = await connection.getAccountInfo(agentPda);
      const isRegistered = agentAccountInfo !== null;

      const transaction = new Transaction();

      // 2. Register Agent Instruction (if not registered)
      if (!isRegistered) {
        console.log("Agent not registered. Adding register instruction...");
        const agentId = "SimulatedAgent-" + Date.now().toString().slice(-4);
        const discriminator = getIdlDiscriminator("register_agent");

        // Serialize: [Discriminator] + [String Length (u32)] + [String Bytes]
        const idBytes = encoder.encode(agentId);

        // Manual Buffer construction compatible with browser/Buffer import
        const data = Buffer.alloc(8 + 4 + idBytes.length);
        data.set(discriminator, 0);
        data.writeUInt32LE(idBytes.length, 8);
        data.set(idBytes, 12);

        const registerIx = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: data
        });

        transaction.add(registerIx);
      }

      // 3. Create Decision Data
      const decision = {
        agent: "YamakunAgent",
        action: amount > 100 ? "BLOCK" : "APPROVE",
        target: recipient,
        reason: amount > 100 ? "Amount exceeds limit" : "Compliance check passed",
        timestamp: new Date().toISOString()
      };

      // 4. Compute Proof of Decision (PoD)
      const decisionHash = await computeHash(decision);
      const objectiveId = `DEMO-OBJ-${Date.now()}`;

      // PDA: Decision Record
      // seeds = [b"decision", agent_account.key().as_ref(), objective_id.as_bytes()]
      const [decisionPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("decision"), agentPda.toBuffer(), encoder.encode(objectiveId)],
        PROGRAM_ID
      );

      // 5. Log Decision Instruction
      console.log("Adding log_decision instruction...");
      const discLog = getIdlDiscriminator("log_decision");
      const hashBytes = encoder.encode(decisionHash);
      const objBytes = encoder.encode(objectiveId);

      // Layout: [Disc(8)] + [HashStr(4+len)] + [ObjStr(4+len)]
      const logData = Buffer.alloc(8 + 4 + hashBytes.length + 4 + objBytes.length);
      let offset = 0;

      logData.set(discLog, offset); offset += 8;

      logData.writeUInt32LE(hashBytes.length, offset); offset += 4;
      logData.set(hashBytes, offset); offset += hashBytes.length;

      logData.writeUInt32LE(objBytes.length, offset); offset += 4;
      logData.set(objBytes, offset); offset += objBytes.length;

      const logIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: decisionPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true }, // Verified: this account must be initialized by register_agent
          { pubkey: publicKey, isSigner: true, isWritable: true }, // Authority
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: logData
      });

      transaction.add(logIx);

      // 6. Send Transaction
      // Note: We don't skip preflight here to get real errors if it fails
      const sig = await sendTransaction(transaction, connection, { skipPreflight: false });
      console.log("Tx Signature:", sig);

      // 5. Optimistic UI Update
      // We don't update local logs immediately for global feed consistency,
      // or we can add it to a "My Recent" list.
      // For now, let's trust the poller to pick it up or show a success message.
      alert(`Success! Decision Logged.\nObjective: ${objectiveId}\nHash: ${decisionHash.slice(0, 16)}...`);
      // setLogs(...) // Poller will catch it

    } catch (err: any) {
      console.error("Error logging decision:", err);

      // User-friendly error handling
      let msg = "Transaction failed.";
      if (err.message) {
        if (err.message.includes("User rejected")) msg = "Transaction rejected by user.";
        else if (err.message.includes("simulation")) msg = "Simulation failed. Please verify your wallet balance (Devnet SOL needed).";
      }
      if (err.logs) {
        console.log("Simulation logs:", err.logs);
      }

      alert(`Error: ${msg}\n\nCheck console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Effect: Global Activity Feed (Fetch transactions for PROGRAM_ID)
  useEffect(() => {
    if (!connection) return;

    const fetchGlobalLogs = async () => {
      try {
        // Fetch recent transactions for the Logos Program
        const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 20 });

        const newLogs: any[] = [];

        // Parallel fetch for speed
        const txs = await connection.getParsedTransactions(signatures.map(s => s.signature), { maxSupportedTransactionVersion: 0 });

        txs.forEach((tx, i) => {
          if (!tx || tx.meta?.err) return;

          const sig = signatures[i].signature;
          const timestamp = signatures[i].blockTime ? new Date(signatures[i].blockTime! * 1000).toLocaleString() : "Unknown";

          // Determine type of interaction
          // We look for instructions calling our program
          const ix = tx.transaction.message.instructions.find((ix: any) =>
            ix.programId.toString() === PROGRAM_ID.toString()
          ) as any;

          if (ix) {
            // Try to decode data
            // We can't easily decode base58 data from getParsedTransactions without a library or manual Buffer decoding from base58.
            // But we can infer "Action"

            let action = "Unknown Interaction";
            let objective = "Unknown";

            // Simple heuristic based on data size or just label it
            // If we had the data buffer, we could check discriminator.

            if (ix.data) {
              // If we can get data, great. Usually it comes as base58 string in parsed tx if not fully decoded by RPC
              // We'll mark it as a "Logos Interaction"
              action = "Logos Protocol Interaction";
            }

            newLogs.push({
              sig,
              hash: "View On-Chain", // We don't have the hash easily without full decoding
              status: "CONFIRMED",
              timestamp,
              action,
              agent: tx.transaction.message.accountKeys[0].pubkey.toString().slice(0, 8) + "...", // Signer (Payer)
              objective
            });
          }
        });

        if (newLogs.length > 0) {
          setLogs(newLogs);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    };

    fetchGlobalLogs();
    const interval = setInterval(fetchGlobalLogs, 10000);
    return () => clearInterval(interval);
  }, [connection]);

  return (
    <main className="container">
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem", marginTop: "1rem" }}>
        <div className="logo">Logos <span>Dashboard</span></div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={() => setDemoMode(!demoMode)}
            style={{
              padding: "0.5rem 1rem",
              background: demoMode ? "var(--primary)" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            {demoMode ? "Demo Mode ON" : "Demo Mode"}
          </button>
          <WalletMultiButton />
        </div>
      </header>

      <div className="grid">
        {/* Simulator Card */}
        <section className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>🤖 Agent Decision Simulator</h2>
          <p style={{ fontSize: "0.9rem", color: "#888", marginBottom: "1rem" }}>
            Simulate an agent making a compliance-checked decision. Approvals and Rejections are logged on-chain.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "#888" }}>Target Recipient</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "8px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "#888" }}>Details (SOL Amount)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{ width: "100%", padding: "0.75rem", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "8px" }}
              />
              <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.25rem" }}>
                Limit: 100 SOL (AML Rule)
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleScanAndLog}
              disabled={!publicKey || loading}
              style={{ marginTop: "1rem", opacity: (!publicKey || loading) ? 0.5 : 1 }}
            >
              {loading ? "Processing..." : "Simulate & Log Decision"}
            </button>

            {!publicKey && (
              <p style={{ fontSize: "0.8rem", color: "var(--primary)", textAlign: "center" }}>
                Connect Wallet to Operate
              </p>
            )}
          </div>
        </section>

        {/* Live Logs Card */}
        <section className="card">
          <h2 style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between" }}>
            📜 On-Chain Logs
            <span style={{ fontSize: "0.9rem", fontWeight: "normal", color: "#666" }}>Devnet</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {(demoMode ? DEMO_LOGS : logs).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#444", border: "1px dashed #333", borderRadius: "8px" }}>
                No recent logs found.
              </div>
            ) : (
              (demoMode ? DEMO_LOGS : logs).map((log: any, i: number) => (
                <div key={i} style={{ background: "#111", padding: "1rem", borderRadius: "8px", borderLeft: `3px solid ${log.status === "APPROVED" ? "var(--success)" : "var(--error)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className={`status-badge ${log.status === "APPROVED" ? "success" : "error"}`}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>{log.timestamp}</span>
                  </div>
                  {log.action && (
                    <div style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "0.5rem" }}>
                      📊 {log.action}
                    </div>
                  )}
                  {log.agent && (
                    <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
                      Agent: {log.agent} | Policy: {log.objective}
                    </div>
                  )}
                  <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                    PoD: <span style={{ fontFamily: "monospace", color: "#aaa" }}>{log.hash.substring(0, 16)}...</span>
                  </div>
                  <div style={{ fontSize: "0.8rem" }}>
                    <a
                      href={`https://explorer.solana.com/tx/${log.sig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--primary)", textDecoration: "none" }}
                    >
                      View Transaction ↗
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer style={{ marginTop: "4rem", textAlign: "center", color: "#444", fontSize: "0.8rem" }}>
        Logos Agent | Hackathon 2026 | Built with Next.js & Solana
      </footer>
    </main>
  );
}
