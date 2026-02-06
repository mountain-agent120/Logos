"use client";

import { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
// import { Buffer } from "buffer"; // Avoiding Buffer for browser compatibility if possible

// Constants
const PROGRAM_ID = new PublicKey("Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3");

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("GoodUser123456789");
  const [amount, setAmount] = useState(10);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper: Calculate SHA-256 Hash
  async function computeHash(data: any): Promise<string> {
    const json = JSON.stringify(data, Object.keys(data).sort());
    const msgBuffer = new TextEncoder().encode(json);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Action: Scan & Log
  const handleScanAndLog = async () => {
    if (!publicKey) return;
    setLoading(true);

    try {
      // 1. Mock Compliance Check
      const checkResult = {
        passed: amount < 1000,
        reason: amount < 1000 ? "OK" : "AML_RISK_HIGH",
        timestamp: Date.now()
      };

      const decision = {
        objective_id: `WEB_DEMO_${Date.now()}`,
        observations: [{ source: "web_scanner", data: checkResult }],
        action_plan: {
          action: checkResult.passed ? "APPROVE" : "BLOCK",
          target: recipient,
          amount: amount
        }
      };

      // 2. Compute Proof of Decision (PoD)
      const decisionHash = await computeHash(decision);
      console.log("Decision Hash:", decisionHash);

      // 3. Build Instruction
      // log_decision discriminator: [160, 73, 104, 176, 37, 115, 231, 204]
      const discriminator = new Uint8Array([160, 73, 104, 176, 37, 115, 231, 204]);

      // Serialize args: hash(string) + objectiveId(string)
      // String format: len(u32-le) + bytes
      const encoder = new TextEncoder();
      const hashBytes = encoder.encode(decisionHash);
      const objIdBytes = encoder.encode(decision.objective_id);

      const hashLen = new Uint8Array(4);
      new DataView(hashLen.buffer).setUint32(0, hashBytes.length, true);

      const objIdLen = new Uint8Array(4);
      new DataView(objIdLen.buffer).setUint32(0, objIdBytes.length, true);

      const data = new Uint8Array(
        discriminator.length +
        4 + hashBytes.length +
        4 + objIdBytes.length
      );

      let offset = 0;
      data.set(discriminator, offset); offset += 8;
      data.set(hashLen, offset); offset += 4;
      data.set(hashBytes, offset); offset += hashBytes.length;
      data.set(objIdLen, offset); offset += 4;
      data.set(objIdBytes, offset); offset += objIdBytes.length;

      // PDAs
      // agent_pda = ["agent", authority]
      // Use TextEncoder for seeds to avoid Buffer issues
      const [agentPda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("agent"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      // decision_pda = ["decision", agent_pda, objective_id]
      const [decisionPda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode("decision"), agentPda.toBuffer(), new TextEncoder().encode(decision.objective_id)],
        PROGRAM_ID
      );

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: decisionPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(data) // @solana/web3.js instructions expect Buffer or compatible
      });

      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection);

      console.log("Tx Signature:", sig);

      // Update UI
      setLogs(prev => [{
        sig,
        hash: decisionHash,
        status: checkResult.passed ? "APPROVED" : "BLOCKED",
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);

    } catch (err) {
      console.error("Error:", err);
      // alert("Error logging decision. Make sure your agent is registered first? (In this demo assuming yes)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem", marginTop: "1rem" }}>
        <div className="logo">Logos <span>Dashboard</span></div>
        <WalletMultiButton />
      </header>

      <div className="grid">
        {/* Compliance Scanner Card */}
        <section className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>🛡️ Compliance Scanner</h2>

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
                Limit: 1000 SOL (AML Rule)
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleScanAndLog}
              disabled={!publicKey || loading}
              style={{ marginTop: "1rem", opacity: (!publicKey || loading) ? 0.5 : 1 }}
            >
              {loading ? "Processing..." : "Scan & Log Decision"}
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
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#444", border: "1px dashed #333", borderRadius: "8px" }}>
                No recent logs found.
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ background: "#111", padding: "1rem", borderRadius: "8px", borderLeft: `3px solid ${log.status === "APPROVED" ? "var(--success)" : "var(--error)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className={`status-badge ${log.status === "APPROVED" ? "success" : "error"}`}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>{log.timestamp}</span>
                  </div>
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
