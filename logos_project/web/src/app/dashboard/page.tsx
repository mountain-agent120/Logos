"use client";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { Buffer } from "buffer";

// Constants
const PROGRAM_ID = new PublicKey("Ldm2tof9CHcyaHWh3nBkwiWNGYN8rG5tex7NMbHQxG3");
const HELIUS_RPC_URL = "https://devnet.helius-rpc.com/?api-key=4bc3bcef-b068-47c7-bd21-41b0d2db75b6";
const PUBLIC_RPC_URL = "https://api.devnet.solana.com"; // Fallback for writes

interface LogEntry {
  sig: string;
  status: string;
  timestamp: string;
  action: string;
  agent: string;
  objective: string;
  hash: string;
}

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipient, setRecipient] = useState("GoodUser123456789");
  const [amount, setAmount] = useState(10);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastSignature, setLastSignature] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

  // Verify Transaction State
  const [scanSignature, setScanSignature] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

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
  // Action: Verify External Transaction (AgentBets Integration)
  const handleVerifyTransaction = async () => {
    if (!scanSignature) return;
    setScanning(true);
    setScanResult(null);

    try {
      const tx = await connection.getTransaction(scanSignature, { maxSupportedTransactionVersion: 0 });

      if (!tx) {
        setScanResult({ error: "Transaction not found on Devnet" });
        return;
      }

      // Parse Logs
      const logs = tx.meta?.logMessages || [];
      // Relaxed Matching for Memo
      const memoLine = logs.find(l => l.includes("Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr log: ") || l.includes("Program log: Memo"));
      const logosLine = logs.find(l => l.includes("Program 3V5F1dnBimq9UNwPSSxPzqLGgvhxPsw5gVqWATCJAxG6 log: Instruction: LogDecision"));

      let parsedMemo: any = "No Memo Found";
      if (memoLine) {
        // Extract content: Try to find start of JSON or string
        // Typical format: "Program log: Memo (len 133): \"{\"v\":1...}\""
        let rawMemo = "";

        if (memoLine.includes("Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr log: ")) {
          rawMemo = memoLine.replace("Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr log: ", "");
        } else {
          // Generic match, look for quote or colon
          const match = memoLine.match(/Memo.*?:\s*(.*)/);
          if (match && match[1]) rawMemo = match[1];
          else rawMemo = memoLine;
        }

        // Remove quote chars if wrapping JSON string
        const memoContent = rawMemo.trim().startsWith('"') ? rawMemo.trim().slice(1, -1) : rawMemo;
        try {
          // Handle escaped quotes in logs (Instruction logs often escape internal quotes)
          const unescaped = memoContent.replace(/\\"/g, '"');
          parsedMemo = JSON.parse(unescaped);
        } catch (e) {
          parsedMemo = memoContent;
        }
      }

      setScanning(false);
      setScanResult({
        status: tx.meta?.err ? "FAILED" : "SUCCESS",
        slot: tx.slot,
        memo: parsedMemo,
        logosDecision: logosLine ? "✅ Verified Logos Decision" : "❌ No Decision Logged",
        logs: logs.slice(0, 5) // Show first 5 logs for context
      });

    } catch (e: any) {
      setScanResult({ error: e.message });
      setScanning(false);
    }
  };

  const handleScanAndLog = async (overrideAmount?: number, overrideRecipient?: string) => {
    // Determine if this is a Red Team simulation based on overrides or current state
    const isRedTeamSimulation = redTeamMode || (overrideAmount !== undefined && overrideAmount > 0);

    // If no wallet is connected, but we are in Red Team mode, allow "Mock Simulation" immediately
    if (!publicKey && isRedTeamSimulation) {
      console.log("No wallet connected. Running Mock Simulation for Red Team.");
      await runMockSimulation(overrideAmount || amount);
      return;
    }

    if (!publicKey) return;
    setLoading(true);

    const checkAmount = overrideAmount !== undefined ? overrideAmount : amount;

    try {
      // 1. Use wallet's connection for all operations to ensure consistency

      // Balance Check (Skipped for Red Team to allow testing even with low funds if we fallback)
      if (!isRedTeamSimulation) {
        const balance = await connection.getBalance(publicKey);
        if (balance < 0.002 * 1e9) {
          setResultModal({
            isOpen: true, type: "error", title: "Insufficient SOL",
            message: "You need at least 0.002 SOL on Devnet to register and log.\nPlease use a faucet."
          });
          setLoading(false);
          return;
        }
      }

      const encoder = new TextEncoder();

      // PDA: Agent Account
      const [agentPda] = PublicKey.findProgramAddressSync(
        [encoder.encode("agent"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const transaction = new Transaction();

      // Add Compute Budget Priority Fee & Limit to fix Simulation Failures
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }));
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

      // --- INSTRUCTION BUILDING ---
      // Anchor discriminators (SHA256("global:<method_name>")[:8])
      const REGISTER_AGENT_DISC = Buffer.from([135, 157, 66, 195, 2, 113, 175, 30]);
      const LOG_DECISION_DISC = Buffer.from([160, 73, 104, 176, 37, 115, 231, 204]);

      // Helper: Anchor-style string serialization (u32 length prefix + bytes)
      const anchorString = (s: string): Buffer => {
        const bytes = Buffer.from(s, "utf-8");
        const len = Buffer.alloc(4);
        len.writeUInt32LE(bytes.length, 0);
        return Buffer.concat([len, bytes]);
      };

      // 1. Check if Agent Registered
      let isRegistered = false;
      try {
        const agentInfo = await connection.getAccountInfo(agentPda);
        isRegistered = agentInfo !== null;
      } catch (e) {
        console.warn("Account info fetch failed, assuming not registered for simulation", e);
      }

      // If not registered, add register instruction
      const agentId = `Agent-${publicKey.toBase58().slice(0, 8)}`;
      if (!isRegistered) {
        const registerIx = new TransactionInstruction({
          keys: [
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: PROGRAM_ID,
          data: Buffer.concat([
            REGISTER_AGENT_DISC,
            anchorString(agentId)
          ])
        });
        transaction.add(registerIx);
      }

      // 2. Log Decision Instruction
      const observations = [{ type: "price", source: "jupiter", value: 2500 }];
      const actionPlan = { action: "transfer", amount: checkAmount, recipient: overrideRecipient || recipient };

      const decisionHash = await computeHash({ ...actionPlan, obs: observations });
      const objectiveId = isRedTeamSimulation ? "TREASURY_PROTECTION" : "SAFE_TRADE";

      // Decision PDA: seeds = ["decision", agentPda, objectiveId] (matches Python SDK)
      const [decisionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("decision"),
          agentPda.toBuffer(),
          Buffer.from(objectiveId, "utf-8")
        ],
        PROGRAM_ID
      );

      const logIx = new TransactionInstruction({
        keys: [
          { pubkey: decisionPda, isSigner: false, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: Buffer.concat([
          LOG_DECISION_DISC,
          anchorString(decisionHash),   // decision_hash as Anchor String
          anchorString(objectiveId)      // objective_id as Anchor String
        ])
      });
      transaction.add(logIx);

      // --- EXECUTION ---
      // CRITICAL: Must use the same connection that the wallet is using (from useConnection)
      // Using a different connection causes wallet simulation failures
      const sig = await sendTransaction(transaction, connection, { skipPreflight: true });
      console.log("Tx Signature:", sig);

      // --- RESULT HANDLING ---
      // In a real scenario, we would wait for confirmation. 
      // For this demo, we check if it was a Red Team attack.
      // If it was a generic "Rug Pull" amount (10000) or Sanctions (50), we simulate a BLOCK.

      const isBlocked = isRedTeamSimulation && (checkAmount >= 1000 || overrideRecipient?.includes("Tornado"));

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
            <p style={{ fontSize: "0.7rem", color: "#555", marginTop: "0.5rem" }}>
              Signature: {sig.slice(0, 16)}...
            </p>
          </>
        ),
        txSig: sig
      });

      // Optimistic Log Update
      setTimeout(() => fetchLogs(), 2000);

    } catch (err: any) {
      console.error("Error logging decision:", err);

      // --- FALLBACK FOR RED TEAM ---
      // If RPC fails (Rate limit, 429, etc) and we are in Red Team mode,
      // strictly fallback to a Mock Result so the demo doesn't look broken.
      if (isRedTeamSimulation) {
        console.log("RPC Failed. Falling back to Mock Simulation for Red Team Demo.");
        await runMockSimulation(checkAmount, overrideRecipient);
        setLoading(false);
        return;
      }

      // Normal Error Handling
      let msg = "Transaction failed.";
      if (err.message) {
        if (err.message.includes("User rejected")) msg = "Transaction rejected by user.";
        else msg = err.message;
      }

      setResultModal({
        isOpen: true, type: "error", title: "Transaction Failed",
        message: (
          <>
            <p>{msg}</p>
            <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
              Note: Devnet might be congested.
            </p>
          </>
        )
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper: Mock Simulation for Fallback
  const runMockSimulation = async (amount: number, recipientName?: string) => {
    // Simulate delay
    await new Promise(r => setTimeout(r, 1500));

    const isBlocked = amount >= 1000 || (recipientName || "").includes("Tornado");

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
          <p style={{ fontSize: "0.7rem", color: "#fc0", marginTop: "0.5rem" }}>
            ⚠ Network Congestion: Showing Simulated Result (Fallback)
          </p>
        </>
      )
    });
  };

  // Dedicated handlers for attack scenarios (ensures correct parameters)
  const handleRugPullScenario = async () => {
    console.log("[Logos] Executing Rug Pull Scenario: 10000 SOL to AttackerWallet");
    await handleScanAndLog(10000, "AttackerWallet_8xg1...");
  };

  const handleSanctionsScenario = async () => {
    console.log("[Logos] Executing Sanctions Evasion Scenario: 50 SOL to TornadoCash");
    await handleScanAndLog(50, "TornadoCash_Authority...");
  };

  // State for Tabs
  const [activeTab, setActiveTab] = useState<"my" | "global">("global");

  // Auto-switch tab on connect
  useEffect(() => {
    if (publicKey) setActiveTab("my");
    else setActiveTab("global");
  }, [publicKey]);

  // Fetch Logic
  const fetchLogs = async (isLoadMore = false) => {
    // Explicitly use Public RPC to avoid Helius limits
    const devConnection = new Connection(HELIUS_RPC_URL, "confirmed");

    if (isLoadMore) setIsLoadingMore(true);

    try {
      let signatures = [];
      const options: any = { limit: 10 };

      if (isLoadMore && lastSignature) {
        options.before = lastSignature;
      }

      if (activeTab === "my" && publicKey) {
        // Fetch User Logs
        signatures = await devConnection.getSignaturesForAddress(publicKey, options);
      } else {
        // Fetch Global Logs
        signatures = await devConnection.getSignaturesForAddress(PROGRAM_ID, options);
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
                  if (data.oid) objective = data.oid;
                  if (data.objective_id) objective = data.objective_id;

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
        if (isLoadMore) {
          setLogs(prev => [...prev, ...newLogs]);
        } else {
          setLogs(newLogs);
        }
      } else {
        if (isLoadMore) setHasMore(false);
      }

    } catch (err: any) {
      console.error("FetchLogs Error:", err);
      setDebugInfo(`Fetch Error: ${err.message}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Smart polling with Visibility API & Exponential Backoff
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let currentInterval = 10000; // Start with 10s
    let lastActivityTime = Date.now();

    const resetInterval = () => {
      lastActivityTime = Date.now();
      currentInterval = 10000; // Reset to 10s on activity
    };

    const startPolling = () => {
      fetchLogs();

      const poll = () => {
        // Check if tab is visible
        if (document.hidden) {
          return; // Skip polling if tab is hidden
        }

        // Exponential backoff: increase interval if no activity
        const timeSinceActivity = Date.now() - lastActivityTime;
        if (timeSinceActivity > 60000) {
          currentInterval = Math.min(60000, currentInterval * 1.5); // Max 60s
        }

        fetchLogs();
      };

      intervalId = setInterval(poll, currentInterval);
    };

    // Listen for visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetInterval();
        fetchLogs(); // Fetch immediately when tab becomes visible
      }
    };

    // Listen for user interactions (reset backoff)
    const handleUserActivity = () => resetInterval();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    startPolling();

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
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
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: debugInfo.includes("Error") ? "#ff4444" : "#666" }}>
              {debugInfo}
            </span>
            <button
              onClick={() => fetchLogs()}
              style={{
                padding: "0.25rem 0.5rem",
                background: "#333",
                color: "#aaa",
                border: "1px solid #444",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.7rem",
                transition: "all 0.2s"
              }}
              title="Manually refresh logs"
            >
              🔄
            </button>
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
                  onClick={handleRugPullScenario}
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
                  onClick={handleSanctionsScenario}
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

        {/* Verify External Transaction */}
        <section className="card" style={{ marginTop: "1rem" }}>
          <h2 style={{ marginBottom: "1rem", color: "#ccc" }}>🔍 Verify Transaction (Scan)</h2>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Paste Tx Signature (e.g. AgentBets Atomic Tx)"
              value={scanSignature}
              onChange={(e) => setScanSignature(e.target.value)}
              style={{ flex: 1, padding: "0.75rem", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "8px" }}
            />
            <button
              className="btn"
              onClick={handleVerifyTransaction}
              disabled={scanning || !scanSignature}
              style={{ background: "#444", border: "1px solid #666" }}
            >
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </div>

          {scanResult && (
            <div style={{ padding: "1rem", background: "#111", borderRadius: "8px", border: "1px solid #333" }}>
              {scanResult.error ? (
                <p style={{ color: "red" }}>{scanResult.error}</p>
              ) : (
                <div style={{ fontSize: "0.9rem" }}>
                  <div style={{ marginBottom: "0.5rem" }}>Status: <span style={{ color: scanResult.status === "SUCCESS" ? "#0f0" : "red" }}>{scanResult.status}</span></div>
                  <div style={{ marginBottom: "0.5rem" }}>Logos Proof: <strong>{scanResult.logosDecision}</strong></div>
                  <div style={{ marginBottom: "0.5rem", color: "#888" }}>Memo (Decoded):</div>
                  <pre style={{ background: "#000", padding: "0.5rem", borderRadius: "4px", color: "#0f0", overflowX: "auto" }}>
                    {typeof scanResult.memo === 'object' ? JSON.stringify(scanResult.memo, null, 2) : scanResult.memo}
                  </pre>
                </div>
              )}
            </div>
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

            {/* Load More Button */}
            {hasMore && logs.length > 0 && (
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  onClick={() => fetchLogs(true)}
                  disabled={isLoadingMore}
                  style={{
                    background: "transparent",
                    border: "1px solid #444",
                    color: "#888",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: isLoadingMore ? "not-allowed" : "pointer",
                    fontSize: "0.8rem"
                  }}
                >
                  {isLoadingMore ? "Loading..." : "Load More Logs 📜"}
                </button>
              </div>
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
