/**
 * Commit-Reveal Pattern Test Suite
 * Tests the cryptographic integrity of Logos SDK
 */

import { Connection, Keypair } from '@solana/web3.js';
import { LogosAgent } from '../src/index';
import * as crypto from 'crypto';

describe('Commit-Reveal Pattern', () => {
    let agent: LogosAgent;
    let connection: Connection;
    let wallet: Keypair;

    beforeAll(() => {
        // Use Devnet for integration tests
        connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        wallet = Keypair.generate(); // Mock wallet for unit tests
        agent = new LogosAgent({ connection, wallet });
    });

    describe('Hash Integrity', () => {
        test('should generate consistent hashes for same data + salt', () => {
            const data = { prediction: 'SOL will reach $150', confidence: 0.8 };
            const salt = 'test-salt-123';

            const dataStr = JSON.stringify(data, Object.keys(data).sort());
            const hash1 = crypto.createHash('sha256').update(dataStr + salt).digest('hex');
            const hash2 = crypto.createHash('sha256').update(dataStr + salt).digest('hex');

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA256 = 64 hex chars
        });

        test('should generate different hashes for different data', () => {
            const data1 = { prediction: 'SOL will reach $150' };
            const data2 = { prediction: 'SOL will reach $200' };
            const salt = 'same-salt';

            const hash1 = crypto.createHash('sha256').update(JSON.stringify(data1) + salt).digest('hex');
            const hash2 = crypto.createHash('sha256').update(JSON.stringify(data2) + salt).digest('hex');

            expect(hash1).not.toBe(hash2);
        });

        test('should generate different hashes for different salts', () => {
            const data = { prediction: 'SOL will reach $150' };
            const hash1 = crypto.createHash('sha256').update(JSON.stringify(data) + 'salt1').digest('hex');
            const hash2 = crypto.createHash('sha256').update(JSON.stringify(data) + 'salt2').digest('hex');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Data Serialization', () => {
        test('should handle nested objects consistently', () => {
            const data = {
                prediction: { asset: 'SOL', price: 150 },
                metadata: { source: 'technical_analysis', timestamp: 1234567890 }
            };
            const salt = 'test';

            const str1 = JSON.stringify(data, Object.keys(data).sort());
            const str2 = JSON.stringify(data, Object.keys(data).sort());

            expect(str1).toBe(str2);
        });

        test('should handle arrays', () => {
            const data = { predictions: [100, 150, 200], confidence: 0.9 };
            const salt = 'test';
            const hash = crypto.createHash('sha256').update(JSON.stringify(data, Object.keys(data).sort()) + salt).digest('hex');

            expect(hash).toBeTruthy();
            expect(hash).toHaveLength(64);
        });

        test('should handle various data types', () => {
            const testCases = [
                { num: 123 },
                { str: 'test' },
                { bool: true },
                { arr: [1, 2, 3] },
                { nested: { a: 1, b: { c: 2 } } },
            ];

            testCases.forEach(data => {
                const hash = crypto.createHash('sha256').update(JSON.stringify(data, Object.keys(data).sort()) + 'salt').digest('hex');
                expect(hash).toHaveLength(64);
            });
        });
    });

    describe('Commit-Reveal Workflow (Dry Run)', () => {
        test('should commit and reveal successfully with correct data', async () => {
            const predictionData = {
                asset: 'SOL',
                target_price: 150,
                confidence: 0.85
            };
            const topicId = 'TEST-' + Date.now();

            // Commit (dry run)
            const commitResult = await agent.commit(predictionData, topicId, { dryRun: true });

            expect(commitResult.signature).toContain('dry_run:');
            expect(commitResult.salt).toBeTruthy();
            expect(commitResult.commitment).toHaveLength(64);

            // Reveal with same data and salt
            const revealResult = await agent.reveal(predictionData, topicId, commitResult.salt, { dryRun: true });

            expect(revealResult.commitment).toBe(commitResult.commitment);
        });

        test('should fail to verify with wrong salt', async () => {
            const predictionData = { prediction: 'SOL $150' };
            const topicId = 'TEST-WRONG-SALT';

            const commitResult = await agent.commit(predictionData, topicId, { dryRun: true });
            const wrongSalt = 'definitely-wrong-salt';

            // Recalculate with wrong salt
            const dataStr = JSON.stringify(predictionData, Object.keys(predictionData).sort());
            const wrongCommitment = crypto.createHash('sha256').update(dataStr + wrongSalt).digest('hex');

            expect(wrongCommitment).not.toBe(commitResult.commitment);
        });

        test('should fail to verify with tampered data', async () => {
            const originalData = { prediction: 'SOL $150' };
            const tamperedData = { prediction: 'SOL $200' }; // Changed after commit
            const topicId = 'TEST-TAMPERED';

            const commitResult = await agent.commit(originalData, topicId, { dryRun: true });

            // Try to reveal with tampered data
            const revealResult = await agent.reveal(tamperedData, topicId, commitResult.salt, { dryRun: true });

            expect(revealResult.commitment).not.toBe(commitResult.commitment);
        });
    });

    describe('Salt Generation', () => {
        test('should generate unique salts', async () => {
            const data = { test: 'data' };
            const topic = 'TEST';

            const commit1 = await agent.commit(data, topic, { dryRun: true });
            const commit2 = await agent.commit(data, topic, { dryRun: true });

            expect(commit1.salt).not.toBe(commit2.salt);
            expect(commit1.commitment).not.toBe(commit2.commitment);
        });

        test('should accept custom salt', async () => {
            const data = { test: 'data' };
            const customSalt = 'my-custom-salt-12345';

            const result = await agent.commit(data, 'TEST', { salt: customSalt, dryRun: true });

            expect(result.salt).toBe(customSalt);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty object', async () => {
            const result = await agent.commit({}, 'EMPTY', { dryRun: true });
            expect(result.commitment).toHaveLength(64);
        });

        test('should handle special characters in data', async () => {
            const data = {
                text: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
                unicode: '日本語 émojis 🚀'
            };
            const result = await agent.commit(data, 'SPECIAL', { dryRun: true });
            expect(result.commitment).toHaveLength(64);
        });

        test('should handle large data objects', async () => {
            const largeData = {
                predictions: Array(100).fill(0).map((_, i) => ({ price: i * 10, confidence: Math.random() }))
            };
            const result = await agent.commit(largeData, 'LARGE', { dryRun: true });
            expect(result.commitment).toHaveLength(64);
        });
    });
});
