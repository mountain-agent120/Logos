import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence, Img, staticFile } from 'remotion';

const Title = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 30);
    const scale = spring({ frame, fps: 30, config: { damping: 200 } });

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <h1 style={{ color: '#00ffcc', fontSize: 120, opacity, transform: `scale(${scale})`, fontFamily: 'Inter, sans-serif' }}>Logos</h1>
            <p style={{ color: 'white', fontSize: 60, opacity: Math.max(0, frame - 30) / 20, fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                The Agent's Conscience
            </p>
        </AbsoluteFill>
    );
};

const CodeHighlight = () => {
    const frame = useCurrentFrame();
    const opacity = Math.min(1, frame / 20);
    return (
        <AbsoluteFill style={{ backgroundColor: '#1e1e1e', padding: 50, justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ opacity, transform: `translateY(${interpolate(frame, [0, 30], [50, 0], { extrapolateRight: 'clamp' })}px)` }}>
                <h2 style={{ color: '#fff', marginBottom: 40, fontFamily: 'sans-serif' }}>Atomic Skin-in-the-Game</h2>
                <div style={{ backgroundColor: '#252526', padding: 40, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <pre style={{ color: '#d4d4d4', fontSize: 40, fontFamily: 'monospace', margin: 0 }}>
                        <span style={{ color: '#c586c0' }}>await</span> agent.<span style={{ color: '#dcdcaa' }}>buyAndCommit</span>(
                        <br />    <span style={{ color: '#ce9178' }}>"market-id"</span>,
                        <br />    <span style={{ color: '#b5cea8' }}>0.1</span>, <span style={{ color: '#6a9955' }}>// SOL Amount</span>
                        <br />    <span style={{ color: '#ce9178' }}>"Prediction Logic..."</span>
                        <br />);
                    </pre>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const ProofReveal = () => {
    const frame = useCurrentFrame();
    const scale = interpolate(frame, [0, 90], [1, 1.1], { extrapolateRight: 'clamp' });
    const opacity = Math.min(1, frame / 20);

    return (
        <AbsoluteFill style={{ backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ opacity }}>
                <Img src={staticFile("agent_bets_proof.png")} style={{ transform: `scale(${scale})`, width: '85%', borderRadius: 10, border: '2px solid #333' }} />
                <div style={{
                    position: 'absolute',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 255, 0, 0.9)',
                    padding: '20px 40px',
                    borderRadius: 50,
                    boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
                }}>
                    <h2 style={{ color: '#000', margin: 0, fontSize: 40, fontFamily: 'sans-serif', fontWeight: 'bold' }}>✅ Verified On-Chain</h2>
                </div>
            </div>
        </AbsoluteFill>
    );
};

export const MyComposition = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            <Sequence from={0} durationInFrames={90}>
                <Title />
            </Sequence>
            <Sequence from={90} durationInFrames={120}>
                <CodeHighlight />
            </Sequence>
            <Sequence from={210} durationInFrames={150}>
                <ProofReveal />
            </Sequence>
        </AbsoluteFill>
    );
};
