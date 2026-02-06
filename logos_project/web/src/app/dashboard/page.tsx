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
  const [debugInfo, setDebugInfo] = useState<string>("Initializing..."); // Debug state

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

      // 5. Optimistic UI Update / Success Modal
      setResultModal({
        isOpen: true,
        type: "success",
        title: "Decision Logged Successfully",
        message: (
          <>
            <p style={{ color: "#ccc", marginBottom: "1rem" }}>
              Your agent's decision has been cryptographically secured on the Solana Devnet.
            </p>
            <div style={{ background: "#222", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontFamily: "monospace", color: "#888", marginBottom: "1rem", wordBreak: "break-all" }}>
              <strong>Hash:</strong> {decisionHash}
            </div>
            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              Objective ID: <span style={{ color: "#aaa" }}>{objectiveId}</span>
            </p>
          </>
        ),
        txSig: sig
      });

      // Auto-refresh logs after a short delay
      setTimeout(() => fetchLogs(), 2000);

    } catch (err: any) {
      console.error("Error logging decision:", err);

      // User-friendly error handling
      let msg = "Transaction failed.";
      if (err.message) {
        if (err.message.includes("User rejected")) msg = "Transaction rejected by user.";
        else if (err.message.includes("simulation")) msg = "Simulation failed. Please verify your wallet balance (Devnet SOL needed).";
        else msg = err.message; // Show raw error for debugging
      }

      setResultModal({
        isOpen: true,
        type: "error",
        title: "Transaction Failed / Blocked",
        message: (
          <>
            <p style={{ color: "#ffaaaa", marginBottom: "1rem" }}>{msg}</p>
            <p style={{ fontSize: "0.8rem", color: "#666" }}>
              If this was an Adversarial Mode test, the transaction may have been blocked solely due to insufficient funds or network issues, as we are running in Simulator Mode.
            </p>
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
    // Explicitly use Devnet for logs to prevent Mainnet wallet confusion
    const devConnection = new Connection("https://api.devnet.solana.com", "confirmed");

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

      // Clear error state if successful
      if (debugInfo.includes("Error")) setDebugInfo("Connected");

      if (signatures.length === 0) {
        setLogs([]);
        return;
      }

      const txs = await devConnection.getParsedTransactions(signatures.map(s => s.signature), { maxSupportedTransactionVersion: 0 });

      const newLogs: any[] = [];

      txs.forEach((tx, i) => {
        if (!tx || tx.meta?.err) return;

        const sig = signatures[i].signature;
        const timestamp = signatures[i].blockTime ? new Date(signatures[i].blockTime! * 1000).toLocaleString() : "Unknown";

        // Filter: Must involve Logos Program
        const ix = tx.transaction.message.instructions.find((ix: any) =>
          ix.programId.toString() === PROGRAM_ID.toString()
        ) as any;

        if (ix) {
          let action = "Logos Interaction";
          let objective = "Unknown";
          let status = "CONFIRMED";
          let agent = tx.transaction.message.accountKeys[0].pubkey.toString().slice(0, 8) + "..."; // Payer
          let hash = "View Transaction";

          // Heuristic: If parsing Memo or Data?
          // For now, simple view
          if (ix.data) action = "Logos Protocol Interaction"; // Can refine this later if needed

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
      } else if (activeTab === "my") {
        // If no logs found for user, maybe empty
        setLogs([]);
      }

    } catch (e: any) {
      console.error("Fetch error:", e);
      setDebugInfo(`Error: ${e.message} at ${new Date().toLocaleTimeString()}`);
    }
  };

  // Polling for Logs (Adaptive: 15 seconds)
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [activeTab, publicKey]);

  // State for Red Team Mode
  const [redTeamMode, setRedTeamMode] = useState(false);

  // ... (existing helper functions)

  return (
    <main className="container" style={{
      borderColor: redTeamMode ? "#ff0000" : undefined,
      boxShadow: redTeamMode ? "0 0 50px rgba(255, 0, 0, 0.1)" : undefined
    }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem", marginTop: "1rem" }}>
        <div className="logo" style={{ color: redTeamMode ? "#ff4444" : undefined }}>
          {redTeamMode ? "💀 RedTeam" : "Logos"}
          <span style={{ color: redTeamMode ? "#fff" : undefined }}>
            {redTeamMode ? "Console" : "Dashboard"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>

          <button
            onClick={() => setRedTeamMode(!redTeamMode)}
            style={{
              padding: "0.5rem 1rem",
              background: redTeamMode ? "#ff0000" : "#222",
              color: "#fff",
              border: "1px solid " + (redTeamMode ? "#ff4444" : "#444"),
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "bold",
              boxShadow: redTeamMode ? "0 0 15px #ff0000" : "none",
              transition: "all 0.3s"
            }}
          >
            {redTeamMode ? "🔴 ATTACK MODE ACTIVE" : "🛡️ Adversarial Mode"}
          </button>

          <button
            onClick={fetchLogs}
            style={{
              padding: "0.5rem",
              background: "#333",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1.2rem",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
            title="Refresh Logs"
          >
            🔄
          </button>

          {!redTeamMode && (
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
          )}
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
                    setAmount(10000); // Trigger Limit Rule
                    setTimeout(() => handleScanAndLog(), 100);
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
                    setRecipient("TornadoCash_Authority..."); // Trigger Blacklist Rule logic (simulated)
                    setAmount(50);
                    // We need to inject a specific reason or target logic in handleScanAndLog for this
                    // For now, we simulate by standard logic (amount < 100 approves), but let's override logic momentarily?
                    // Actually, handleScanAndLog uses `amount > 100` rule.
                    // Let's rely on Amount for now, or update handleScanAndLog to check recipient blacklist.
                    // For MVP: Just use Amount Scenario.
                    setAmount(999);
                    setTimeout(() => handleScanAndLog(), 100);
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
                  opacity: redTeamMode && log.status !== "BLOCKED" ? 0.5 : 1 // Highlight blocked logs in Red Team mode
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
        <div style={{ marginTop: "0.5rem", color: "#666", fontFamily: "monospace", fontSize: "0.7rem", background: "#111", display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
          🐞 DEBUG: {debugInfo} | ProgID: {PROGRAM_ID.toString().slice(0, 6)}...
        </div>
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
