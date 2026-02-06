'use client';

import { motion } from 'framer-motion';
import { Shield, Brain, Activity, Lock, ExternalLink, Code, Database, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
    const features = [
        {
            icon: <Shield className="w-8 h-8 text-cyan-400" />,
            title: "Proof of Decision",
            desc: "Cryptographically anchor every agent action to Solana. Verify 'what' it saw and 'why' it acted.",
        },
        {
            icon: <Lock className="w-8 h-8 text-purple-400" />,
            title: "Privacy First",
            desc: "Protect your alpha. Hash observations on-chain while keeping sensitive model weights off-chain.",
        },
        {
            icon: <Activity className="w-8 h-8 text-green-400" />,
            title: "Real-time Audit",
            desc: "Monitor compliance live. Detect hallucinations, unauthorized trades, and policy violations instantly.",
        },
    ];

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-cyan-500/30">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-cyan-500" />
                        <span className="font-bold text-xl tracking-tight">LOGOS</span>
                    </div>
                    <Link href="/dashboard">
                        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-all text-sm backdrop-blur-sm border border-white/10">
                            Launch App
                        </button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="z-10 text-center px-4 max-w-5xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        Live on Solana Devnet
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
                        THE FLIGHT RECORDER <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                            FOR AI AGENTS
                        </span>
                    </h1>

                    <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
                        Don't just trust your autonomous agents. <strong>Verify them.</strong><br />
                        Logos provides the immutable audit layer for the agent economy.
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-12">
                        <span className="text-lg">⏰</span>
                        <span>Agents are moving real money. Regulators are watching. Build trust NOW.</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/dashboard">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-cyan-500 text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-shadow"
                            >
                                Launch Dashboard <ExternalLink size={20} />
                            </motion.button>
                        </Link>
                        <Link href="https://github.com/mountain-agent120/Logos" target="_blank">
                            <button className="px-8 py-4 rounded-full font-bold text-lg text-white border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2">
                                <Code size={20} /> Documentation
                            </button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-6 bg-black/50 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="p-8 rounded-2xl bg-neutral-900/50 border border-white/5 hover:border-cyan-500/30 transition-colors group"
                            >
                                <div className="mb-6 p-4 rounded-xl bg-white/5 w-fit group-hover:bg-cyan-500/10 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Logos? Section */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Why <span className="text-cyan-500">Logos</span>?
                        </h2>
                        <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                            When your agent makes a $1M trade at 3am, can you prove what it saw and why it acted?
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Without Logos */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-2xl bg-red-500/5 border border-red-500/20"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <span className="text-2xl">❌</span>
                                </div>
                                <h3 className="text-2xl font-bold text-red-400">Without Logos</h3>
                            </div>
                            <ul className="space-y-4 text-gray-300">
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-1">•</span>
                                    <span><strong>No proof</strong> of what the agent observed</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-1">•</span>
                                    <span><strong>No record</strong> of decision reasoning</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-1">•</span>
                                    <span><strong>No way</strong> to verify policy compliance</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-red-500 mt-1">•</span>
                                    <span><strong>Liability</strong> falls on... who?</span>
                                </li>
                            </ul>
                            <div className="mt-6 p-4 bg-black/30 rounded-lg border border-red-500/10">
                                <p className="text-sm text-gray-400 italic">
                                    "The AI did it" — No accountability, no trust, no scale.
                                </p>
                            </div>
                        </motion.div>

                        {/* With Logos */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-2xl bg-cyan-500/5 border border-cyan-500/20"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-cyan-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-cyan-400">With Logos</h3>
                            </div>
                            <ul className="space-y-4 text-gray-300">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                                    <span><strong>Immutable record</strong> of observations</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                                    <span><strong>Decision hash</strong> proves intent</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                                    <span><strong>Audit trail</strong> verifies policy adherence</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                                    <span><strong>Clear liability</strong>: Agent vs. External attack</span>
                                </li>
                            </ul>
                            <div className="mt-6 p-4 bg-black/30 rounded-lg border border-cyan-500/10">
                                <p className="text-sm text-cyan-400 font-medium">
                                    "Trust, but Verify." — Accountability, trust, scale.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Real Scenario */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-12 p-8 rounded-2xl bg-neutral-900/50 border border-white/5"
                    >
                        <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="text-2xl">🚨</span>
                            Real Scenario: The $10M Mystery Trade
                        </h4>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300">
                            <div>
                                <p className="mb-4">
                                    <strong className="text-white">3:00 AM, Tuesday</strong><br />
                                    Your DeFi agent executes a $10M swap: SOL → USDC<br />
                                    Slippage: 15% (expected: 0.5%)<br />
                                    <span className="text-red-400">Loss: $1.5M</span>
                                </p>
                                <p className="text-sm text-gray-400">
                                    Was it a bug? A hack? A hallucination?
                                </p>
                            </div>
                            <div className="bg-black/30 p-4 rounded-lg border border-cyan-500/10">
                                <p className="text-sm mb-2 text-cyan-400 font-mono">Logos Audit Trail:</p>
                                <ul className="text-xs space-y-1 text-gray-400 font-mono">
                                    <li>✓ Agent saw Jupiter quote: 0.5% slippage</li>
                                    <li>✓ Decision hash proves intent: 0.5%</li>
                                    <li>✓ Policy compliance: PASSED</li>
                                    <li className="text-cyan-400">→ Conclusion: External MEV attack</li>
                                </ul>
                                <p className="mt-3 text-xs text-green-400">
                                    ✓ Developer liability cleared<br />
                                    ✓ Insurance claim approved
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-16">How Logos Works</h2>
                    <div className="relative">
                        {/* Connector Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 to-purple-500 -translate-x-1/2 hidden md:block opacity-30" />

                        <div className="space-y-12">
                            <Step number="1" title="Agent Observes" desc="Your agent gathers data (prices, Tweets, DAOs)." align="left" />
                            <Step number="2" title="Logos Hashes" desc="The SDK creates a SHA-256 hash of the observation & intended action." align="right" />
                            <Step number="3" title="Anchored on Solana" desc="The hash is stored in a PDA on-chain. Immutable & verifiable." align="left" />
                            <Step number="4" title="Verification" desc="Operators use this dashboard to verify execution matches intent." align="right" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 text-center text-gray-500 border-t border-white/5">
                <p>© 2026 Logos Project. Built for the Colosseum Agent Hackathon.</p>
            </footer>
        </div>
    );
}

function Step({ number, title, desc, align }: { number: string; title: string; desc: string; align: 'left' | 'right' }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: align === 'left' ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className={`flex md:justify-${align === 'left' ? 'end' : 'start'} relative`}
        >
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 w-8 h-8 rounded-full bg-black border-2 border-cyan-500 z-10" />

            <div className={`md:w-1/2 ${align === 'left' ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'} p-4`}>
                <div className="inline-block p-4 rounded-xl bg-neutral-900 border border-white/10 w-full hover:border-white/20 transition-colors">
                    <span className="text-cyan-500 font-mono text-sm mb-2 block">STEP 0{number}</span>
                    <h4 className="text-xl font-bold mb-2">{title}</h4>
                    <p className="text-gray-400 text-sm">{desc}</p>
                </div>
            </div>
        </motion.div>
    )
}
