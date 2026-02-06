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
      // 1. Create Decision Data
      const decision = {
        agent: "YamakunAgent",
        action: amount > 100 ? "BLOCK" : "APPROVE",
        target: recipient,
        reason: amount > 100 ? "Amount exceeds limit" : "Compliance check passed",
        timestamp: new Date().toISOString()
      };

      // 2. Compute Hash
      const decisionHash = await computeHash(decision);

      // 3. Create Memo Instruction
      // Format: "LOGOS:v1:<HASH>:<JSON_DATA>"
      const memoContent = `LOGOS:v1:${decisionHash}:${JSON.stringify(decision)}`;

      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb"),
        data: Buffer.from(new TextEncoder().encode(memoContent)),
      });

      const tx = new Transaction().add(memoInstruction);

      // 4. Send Transaction
      const sig = await sendTransaction(tx, connection);
      console.log("Tx Signature:", sig);

      // 5. Optimistic UI Update
      setLogs(prev => [{
        sig,
        hash: decisionHash,
        status: decision.action === "APPROVE" ? "APPROVED" : "BLOCKED",
        timestamp: "Just Now",
        action: `Action: ${decision.action} -> ${recipient}`,
        agent: "You (Simulator)",
        objective: "Demo-Policy"
      }, ...prev]);

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
        // Check for specific anchor errors if possible
      }

      alert(`Error: ${msg}\n\nCheck console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Effect: Fetch Logs (Poll for accounts owned by program)
  // We revert to checking program accounts because 'getParsedTransaction' for custom programs
  // won't show inner instruction details easily unless we define a parser.
  // Fetching program accounts is more robust for "Show me all logs on chain".
  useEffect(() => {
    if (!connection) return;

    const fetchLogs = async () => {
      try {
        // Fetch DecisionRecord accounts (size check or discriminator check)
        // DecisionRecord size: 8 + 32 + (4+64) + (4+len) + 8. Min size > 100.
        // We'll just fetch all and filter by discriminator.
        const accounts = await connection.getProgramAccounts(PROGRAM_ID);

        const validLogs: any[] = [];

        for (const acc of accounts) {
          const data = acc.account.data as Buffer;
          if (data.length < 8) continue;

          // Check discriminator for DecisionRecord:
          // No easy way to know exact discriminator without IDL gen, but expected is unique.
          // Let's assume decoding works if schema matches.

          const decoded = decodeAccountData(data, acc.pubkey);
          if (decoded) {
            validLogs.push({
              sig: "ON_CHAIN", // We don't have the sig here easily without more queries
              hash: decoded.hash,
              status: "VERIFIED",
              timestamp: "Synced",
              action: "DECISION LOGGED",
              agent: "Logos Agent",
              objective: decoded.objective,
              pubkey: decoded.pubkey
            });
          }
        }

        if (validLogs.length > 0) {
          setLogs(prev => {
            // De-duplicate based on pubkey
            const existingKeys = new Set(prev.map(l => l.pubkey));
            const newLogs = validLogs.filter(l => !existingKeys.has(l.pubkey));
            return [...newLogs, ...prev];
          });
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
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
            Simulate an agent making a compliance-checked decision. Approvals and Rejections are logged on-chain (Memo).
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
