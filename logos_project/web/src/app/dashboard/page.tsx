"use client";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";

// Constants
const PROGRAM_ID = new PublicKey("3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6");

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("GoodUser123456789");
  const [amount, setAmount] = useState(10);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [redTeamMode, setRedTeamMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

  // State for Result Modal
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: React.ReactNode;
    txSig?: string;
  }>({ isOpen: false, type: "success", title: "", message: null });

  // Helper: Close Modal
  const closeModal = () => setResultModal({ ...resultModal, isOpen: false });

  // Demo Logs 
  const DEMO_LOGS = [
    {
      sig: "2jCviQoFDX855Sd5PYBxh4tapT5njR6XCdw9D3zCKDLshsDcYjp5NfG7RJbD87P5TatDrcLhcMPahXna72w5cngn",
      status: "BLOCKED",
      timestamp: "2026-02-06 23:45:00",
      action: "Attempted Transfer 10,000 SOL (Rug Pull)",
      agent: "AdversarialBot",
      objective: "Treasury Protection",
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      sig: "41wQ7mwvrNuKMb3CMSYmEyXPHhxu4P8EyRkvMGRF3Zbcgiyc4YDJQL2h9DSuuTzWPZd2FapZmtSKmcMvdpaXgyuC",
      status: "APPROVED",
      timestamp: "2026-02-06 23:44:00",
      action: "SWAP 0.1 SOL → USDC",
      agent: "DemoAgent_v1",
      objective: "Safe Trade Execution",
      hash: "de4e28e57907a9680d22a3afd9c5d2cfbb205ddd55f37a4a9677f09a056498c3"
    },
    {
      sig: "3BmYrk5fCSptnfnv4KuscCHTwtTyyM9Q9dqfdGCk3vS1hSuZAKdZHCS6AZmCHbymNb7zX58Y2ryYerVKrTJdn392",
      status: "APPROVED",
      timestamp: "2026-02-06 23:43:00",
      action: "Agent Registration",
      agent: "System",
      objective: "Protocol Initialization",
      hash: "init_agent_pda"
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

  // Action: Scan & Log (Real Logos Program Interaction)
  // Fix: Accept optional overrides to ensure state updates don't race
  const handleScanAndLog = async (overrideAmount?: number, overrideRecipient?: string) => {
    if (!publicKey) return;
    setLoading(true);

    const checkAmount = overrideAmount !== undefined ? overrideAmount : amount;
    const checkRecipient = overrideRecipient || recipient;

    try {
      // Balance Check
      const balance = await connection.getBalance(publicKey);
      if (balance < 0.002 * 1e9) {
        setResultModal({
          isOpen: true, type: "error", title: "Insufficient SOL",
          message: "You need at least 0.002 SOL on Devnet to register and log.\nPlease use a faucet."
        });
        setLoading(false);
        return;
      }

      const encoder = new TextEncoder();

      // PDA: Agent Account
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
        // global:register_agent -> [135, 157, 66, 195, 2, 113, 175, 30]
        const discriminator = new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]);

        const idBytes = encoder.encode(agentId);
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

        // Memo for Registration
        const memoRegIx = new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(JSON.stringify({ v: 1, type: "logos_log", note: `Agent Registered: ${agentId}` }), 'utf-8')
        });
        transaction.add(memoRegIx);
      }

      // 3. Decision Logic & BLOCK Check
      // Use the 'check' variables which are guaranteed to be current
      const isRugPull = checkAmount > 100;
      const isSanctions = checkRecipient.includes("Tornado") || checkRecipient.includes("Attacker");
      const isBlocked = isRugPull || isSanctions;

      // NOTE: We don't send money in this simulation, we just Log the Decision.

      const objectiveId = isBlocked ? "TREASURY_PROTECTION" : `OBJ-${Date.now().toString().slice(-6)}`;
      const decisionHash = await computeHash({
        action: isBlocked ? "BLOCK" : "APPROVE",
        target: checkRecipient,
        amount: checkAmount,
        timestamp: Date.now()
      });

      // PDA: Decision Record
      const [decisionPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("decision"), agentPda.toBuffer(), encoder.encode(objectiveId)],
        PROGRAM_ID
      );

      // 5. Log Decision Instruction
      const discLog = new Uint8Array([160, 73, 104, 176, 37, 115, 231, 204]);
      const hashBytes = encoder.encode(decisionHash);
      const objBytes = encoder.encode(objectiveId);

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
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: logData
      });
      transaction.add(logIx);

      // 6. Add Memo (Status & Note)
      const memoContent = {
        v: 1,
        type: "logos_log",
        status: isBlocked ? "BLOCKED" : "APPROVED",
        note: isBlocked
          ? (isRugPull ? "BLOCKED: Treasury Drain Attempt > 100 SOL" : "BLOCKED: Sanctions Evasion Policy")
          : `Safe Trade: ${checkAmount} SOL -> ${checkRecipient.slice(0, 6)}...`
      };

      const memoIx = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(JSON.stringify(memoContent), 'utf-8')
      });
      transaction.add(memoIx);

      // 7. Send Transaction
      const sig = await sendTransaction(transaction, connection, { skipPreflight: false });
      console.log("Tx Signature:", sig);

      // 8. Result Modal
      setResultModal({
        isOpen: true,
        type: isBlocked ? "error" : "success",
        title: isBlocked ? "🛑 Transaction BLOCKED" : "✅ Decision Logged",
        message: (
          <>
            <p style={{ color: "#ccc", marginBottom: "1rem" }}>
              {isBlocked
                ? "Logos Policy Engine detected a violation and blocked the malicious action."
                : "Your agent's decision has been cryptographically secured on the Solana Devnet."}
            </p>
            <div style={{ background: "#222", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8rem", color: isBlocked ? "#ff4444" : "#00cc66", marginBottom: "1rem", fontFamily: "monospace" }}>
              Status: {isBlocked ? "BLOCKED (Policy Violation)" : "APPROVED"}
            </div>
            {isBlocked && (
              <p style={{ fontSize: "0.8rem", color: "#666" }}>
                This simulated attack was successfully intercepted. No funds were moved.
              </p>
            )}
          </>
        ),
        txSig: sig
      });

      // Auto-refresh logs after a short delay
      setTimeout(() => fetchLogs(), 5000);

    } catch (err: any) {
      console.error("Error logging decision:", err);
      let msg = "Transaction failed.";
      if (err.message) {
        if (err.message.includes("User rejected")) msg = "Transaction rejected by user.";
        else if (err.message.includes("simulation")) msg = "Simulation failed. Please verify your wallet balance (Devnet SOL needed).";
        else msg = err.message;
      }

      setResultModal({
        isOpen: true, type: "error", title: "Transaction Failed",
        message: (
          <>
            <p>{msg}</p>
            {msg.includes("Simulation failed") && <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>Check Developer Console for details.</p>}
          </>
        )
      });
    } finally {
      setLoading(false);
    }
  };

  // State for Tabs
  const [activeTab, setActiveTab] = useState<"my" | "global">("global");

  // Auto-switch tab on connect
  useEffect(() => {
    if (publicKey) setActiveTab("my");
    else setActiveTab("global");
  }, [publicKey]);

  // Fetch Logic
  const fetchLogs = async () => {
    // Explicitly use Helius RPC for logs to avoid rate limits
    const devConnection = new Connection("https://devnet.helius-rpc.com/?api-key=4bc3bcef-b068-47c7-bd21-41b0d2db75b6", "confirmed");

    try {
      let signatures = [];

      if (activeTab === "my" && publicKey) {
        // Fetch User Logs
        signatures = await devConnection.getSignaturesForAddress(publicKey, { limit: 20 });
      } else {
        // Fetch Global Logs
        signatures = await devConnection.getSignaturesForAddress(PROGRAM_ID, { limit: 20 });
      }

      console.log(`[LogosDebug] Fetched ${signatures.length} signatures for ${activeTab}`);
      setDebugInfo(`Fetched ${signatures.length} sigs at ${new Date().toLocaleTimeString()}`);

      if (signatures.length === 0) {
        setLogs([]);
        return;
      }

      // Fetch transactions individually
      const txs = await Promise.all(
        signatures.map(async (s) => {
          try {
            return await devConnection.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
          } catch (e) {
            console.warn(`Failed to fetch tx ${s.signature}`, e);
            return null;
          }
        })
      );

      const newLogs: any[] = [];

      txs.forEach((tx, i) => {
        if (!tx || tx.meta?.err) return;

        const sig = signatures[i].signature;
        const timestamp = signatures[i].blockTime ? new Date(signatures[i].blockTime! * 1000).toLocaleString() : "Unknown";

        // Filter: Must involve Logos Program
        const logosIx = tx.transaction.message.instructions.find((ix: any) =>
          ix.programId.toString() === PROGRAM_ID.toString()
        ) as any;

        // Check for Memo (SPL Memo v2)
        const memoIx = tx.transaction.message.instructions.find((ix: any) =>
          ix.programId.toString() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        ) as any;

        if (logosIx) {
          let action = "Logos Interaction";
          let objective = "Unknown";
          let status = "APPROVED";
          let agent = tx.transaction.message.accountKeys[0].pubkey.toString().slice(0, 8) + "..."; // Payer
          let hash = "View Transaction";

          // Parse Memo for enhanced details
          if (memoIx) {
            let memoText = "";
            if (memoIx.parsed) {
              memoText = typeof memoIx.parsed === 'string' ? memoIx.parsed : JSON.stringify(memoIx.parsed);
            } else if (memoIx.data) {
              try {
                // Simple heuristic: try to decode if it looks like base58
                memoText = "Memo Found";
              } catch (e) { }
            }

            if (memoText) {
              try {
                const jsonStart = memoText.indexOf('{');
                const jsonEnd = memoText.lastIndexOf('}');
                if (jsonStart >= 0 && jsonEnd > jsonStart) {
                  const jsonStr = memoText.substring(jsonStart, jsonEnd + 1);
                  const data = JSON.parse(jsonStr);

                  if (data.status) status = data.status;

                  // Privacy Update: Prioritize 'note', fallback to 'action'
                  if (data.note) action = data.note;
                  else if (data.action) action = typeof data.action === 'string' ? data.action : JSON.stringify(data.action);

                  if (data.type === "logos_log") {
                    // Verified Logos Memo
                  }
                } else {
                  action = `Memo: ${memoText.slice(0, 50)}...`;
                }
              } catch (e) {
                // Not JSON
                action = `Memo: ${memoText.slice(0, 50)}...`;
              }
            }
          }

          newLogs.push({
            sig,
            hash,
            status,
            timestamp,
            action,
            agent,
            objective
          });
        }
      });

      if (newLogs.length > 0) {
        setLogs(newLogs);
      }

    } catch (err: any) {
      console.error("FetchLogs Error:", err);
      setDebugInfo(`Fetch Error: ${err.message}`);
    }
  };

  // Helper to trigger fetch on load
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: "bold", fontSize: "1.2rem" }}>
            L
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", letterSpacing: "-0.05em" }}>Logos</h1>
          <span style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.1)", padding: "0.2rem 0.6rem", borderRadius: "20px", color: "#aaa" }}>
            Devnet
          </span>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: debugInfo.includes("Error") ? "#ff4444" : "#666" }}>
              {debugInfo}
            </span>
          </div>

          <button
            onClick={() => setRedTeamMode(!redTeamMode)}
            style={{
              padding: "0.5rem 1rem",
              background: redTeamMode ? "#ff4444" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.3s"
            }}
          >
            {redTeamMode ? "Exit Adversarial Mode" : "Adversarial Mode (Red Team)"}
          </button>
          <WalletMultiButton />
        </div>
      </header>

      <div className="grid">
        {/* Simulator / Attack Card */}
        <section className="card" style={{
          border: redTeamMode ? "1px solid #ff4444" : undefined,
          background: redTeamMode ? "linear-gradient(145deg, #1a0000, #000)" : undefined
        }}>
          {redTeamMode ? (
            <>
              <h2 style={{ marginBottom: "1.5rem", color: "#ff4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                💀 Malicious Action Simulator
              </h2>
              <p style={{ fontSize: "0.9rem", color: "#aaa", marginBottom: "2rem" }}>
                Simulate a compromised agent attempting unauthorized actions.
                Logos Policy Engine should <strong style={{ color: "#fff" }}>detect and BLOCK</strong> these transactions on-chain.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Attack Scenario 1: Rug Pull */}
                <button
                  className="btn"
                  onClick={() => {
                    setRecipient("AttackerWallet_8xg1...");
                    setAmount(10000);
                    // Use direct values to avoid state update race conditions
                    handleScanAndLog(10000, "AttackerWallet_8xg1...");
                  }}
                  disabled={loading || !publicKey}
                  style={{
                    background: "#330000",
                    border: "1px solid #ff4444",
                    color: "#ff4444",
                    textAlign: "left",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>⚡ Scenario: Treasury Drain (Rug Pull)</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Attempt to transfer 10,000 SOL to unknown wallet</div>
                  </div>
                  <span style={{ fontSize: "1.2rem" }}>🚨</span>
                </button>

                {/* Attack Scenario 2: Sanctions Evasion */}
                <button
                  className="btn"
                  onClick={() => {
                    setRecipient("TornadoCash_Authority...");
                    setAmount(50);
                    handleScanAndLog(50, "TornadoCash_Authority...");
                  }}
                  disabled={loading || !publicKey}
                  style={{
                    background: "#330000",
                    border: "1px solid #ff4444",
                    color: "#ff4444",
                    textAlign: "left",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "bold" }}>🚫 Scenario: Sanctions Evasion</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>Transfer funds to blacklisted mixing service</div>
                  </div>
                  <span style={{ fontSize: "1.2rem" }}>☠️</span>
                </button>
              </div>
            </>
          ) : (
            <>
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
                  onClick={() => handleScanAndLog()}
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
            </>
          )}
        </section>

        {/* Live Logs Card */}
        <section className="card" style={{ borderColor: redTeamMode ? "#ff4444" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ color: redTeamMode ? "#ff4444" : undefined }}>
              {redTeamMode ? "📜 Audit Trail (Evidence)" : "📜 On-Chain Logs"}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", background: "#222", padding: "0.25rem", borderRadius: "8px" }}>
              <button
                onClick={() => setActiveTab("my")}
                disabled={!publicKey}
                style={{
                  padding: "0.4rem 0.8rem",
                  background: activeTab === "my" ? (redTeamMode ? "#500" : "#444") : "transparent",
                  color: activeTab === "my" ? "#fff" : (publicKey ? "#888" : "#444"),
                  border: "none",
                  borderRadius: "6px",
                  cursor: publicKey ? "pointer" : "not-allowed",
                  fontSize: "0.8rem",
                  transition: "all 0.2s"
                }}
              >
                My Logs
              </button>
              <button
                onClick={() => setActiveTab("global")}
                style={{
                  padding: "0.4rem 0.8rem",
                  background: activeTab === "global" ? (redTeamMode ? "#500" : "#444") : "transparent",
                  color: activeTab === "global" ? "#fff" : "#888",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  transition: "all 0.2s"
                }}
              >
                Global Feed
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {(demoMode ? DEMO_LOGS : logs).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#444", border: "1px dashed #333", borderRadius: "8px" }}>
                {activeTab === "my" ? "No recent logs found for your wallet." : "No global logs found (Devnet is quiet today)."}
              </div>
            ) : (
              (demoMode ? DEMO_LOGS : logs).map((log: any, i: number) => (
                <div key={i} style={{
                  background: "#111",
                  padding: "1rem",
                  borderRadius: "8px",
                  borderLeft: `3px solid ${log.status === "APPROVED" ? "var(--success)" : "var(--error)"}`,
                  opacity: redTeamMode && log.status !== "BLOCKED" ? 0.5 : 1
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className={`status-badge ${log.status === "APPROVED" ? "success" : "error"}`}>
                      {log.status}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>{log.timestamp}</span>
                  </div>
                  {log.action && (
                    <div style={{ fontSize: "0.85rem", color: "#ccc", marginBottom: "0.5rem" }}>
                      {log.action}
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

      {/* Result Modal Overlay */}
      {resultModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
        }}>
          <div style={{
            background: "#111", border: `1px solid ${resultModal.type === "success" ? "#00cc66" : "#ff4444"}`,
            borderRadius: "12px", padding: "2rem", maxWidth: "450px", width: "90%",
            boxShadow: `0 0 30px ${resultModal.type === "success" ? "rgba(0,204,102,0.2)" : "rgba(255,68,68,0.2)"}`,
            animation: "fadeIn 0.2s ease-out"
          }}>
            <h3 style={{
              fontSize: "1.5rem", fontWeight: "bold",
              color: resultModal.type === "success" ? "#00cc66" : "#ff4444",
              marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem"
            }}>
              {resultModal.type === "success" ? "✅ Success" : "🛑 Blocked"}
            </h3>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#fff", marginBottom: "1rem" }}>
              {resultModal.title}
            </div>

            <div style={{ marginBottom: "2rem" }}>
              {resultModal.message}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              {resultModal.txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${resultModal.txSig}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn"
                  style={{
                    flex: 1, textAlign: "center", background: "var(--primary)", color: "#000",
                    textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  View Evidence ↗
                </a>
              )}
              <button
                onClick={closeModal}
                className="btn"
                style={{
                  flex: 1, background: "#333", color: "#fff", border: "1px solid #555"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
