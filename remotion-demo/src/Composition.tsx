import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Img, staticFile } from 'remotion';

const Title = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 30);
    const scale = spring({ frame, fps: 30, config: { damping: 200 } });

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <h1 style={{ color: '#fff', fontSize: 120, opacity, transform: `scale(${scale})`, fontFamily: 'Inter, sans-serif', letterSpacing: '-5px' }}>Logos</h1>
            <p style={{ color: '#888', fontSize: 50, opacity: Math.max(0, frame - 30) / 20, fontFamily: 'Inter, sans-serif', fontWeight: 300, marginTop: 20 }}>
                The <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>Flight Recorder</span> for Autonomous Agents
            </p>
        </AbsoluteFill>
    );
};

const InstallCommand = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 20);
    const text = "npm install logos-ts".slice(0, Math.floor(frame / 2));

    return (
        <AbsoluteFill style={{ backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ color: '#666', marginBottom: 40, fontFamily: 'sans-serif' }}>Get Started</h2>
            <div style={{ backgroundColor: '#000', padding: '30px 60px', borderRadius: 15, border: '1px solid #333', minWidth: 600 }}>
                <code style={{ color: '#0f0', fontSize: 60, fontFamily: 'monospace' }}>
                    &gt; {text}<span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>_</span>
                </code>
            </div>
        </AbsoluteFill>
    );
};

const CodeHighlight = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 20);
    return (
        <AbsoluteFill style={{ backgroundColor: '#1e1e1e', padding: 50, justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ opacity }}>
                <h2 style={{ color: '#fff', marginBottom: 40, fontFamily: 'sans-serif' }}>Atomic "Skin-in-the-Game"</h2>
                <div style={{ backgroundColor: '#252526', padding: 40, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <pre style={{ color: '#d4d4d4', fontSize: 40, fontFamily: 'monospace', margin: 0 }}>
                        <span style={{ color: '#569cd6' }}>await</span> agent.<span style={{ color: '#dcdcaa' }}>buyAndCommit</span>(marketId, amount);
                    </pre>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const ProofReveal = () => {
    const frame = useCurrentFrame();
    const scale = interpolate(frame, [0, 120], [1, 1.05], { extrapolateRight: 'clamp' });
    const opacity = Math.min(1, frame / 20);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ opacity }}>
                <Img src={staticFile("agent_bets_proof.png")} style={{ transform: `scale(${scale})`, width: '85%', borderRadius: 10, border: '2px solid #333' }} />
                <div style={{
                    position: 'absolute',
                    top: '20%',
                    right: '10%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '20px',
                    borderLeft: '5px solid #00ffcc',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
                }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: 32, fontFamily: 'sans-serif' }}>Trusted Audit Log</h3>
                    <p style={{ color: '#aaa', margin: '10px 0 0', fontSize: 24 }}>Every decision verified on-chain.</p>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const Outro = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 30);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <h1 style={{ color: '#fff', fontSize: 80, opacity, fontFamily: 'Inter, sans-serif' }}>Build with Trust.</h1>
            <p style={{ color: '#00ffcc', fontSize: 40, marginTop: 40, opacity: Math.max(0, frame - 20) / 20, fontFamily: 'monospace' }}>
                github.com/mountain-agent120/Logos
            </p>
        </AbsoluteFill>
    );
};

export const MyComposition = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            <Sequence from={0} durationInFrames={90}>
                <Title />
            </Sequence>
            <Sequence from={90} durationInFrames={70}>
                <InstallCommand />
            </Sequence>
            <Sequence from={160} durationInFrames={90}>
                <CodeHighlight />
            </Sequence>
            <Sequence from={250} durationInFrames={110}>
                <ProofReveal />
            </Sequence>
            <Sequence from={360} durationInFrames={90}>
                <Outro />
            </Sequence>
        </AbsoluteFill>
    );
};
