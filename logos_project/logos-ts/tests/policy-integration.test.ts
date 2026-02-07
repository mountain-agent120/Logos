/**
 * Policy Engine Integration Tests
 * Tests BLOCKED scenarios and boundary conditions
 */

import { Connection, Keypair } from '@solana/web3.js';
import { LogosAgent } from '../src/index';

/**
 * Simple Policy Engine (mimics Dashboard logic)
 * In production, this would be enforced on-chain or by Guardian contracts
 */
class PolicyEngine {
    // AML Rule: Block transfers above 100 SOL
    static readonly AML_LIMIT = 100;

    // Sanctions List: Blocked addresses
    static readonly SANCTIONS_LIST = [
        'TornadoCash',
        'Attacker',
        'Mixer',
        'Blacklisted'
    ];

    /**
     * Evaluate if a decision should be blocked
     */
    static evaluate(decision: any): { blocked: boolean; reason?: string } {
        // Check for rug pull (amount > AML_LIMIT)
        if (decision.amount !== undefined && decision.amount > this.AML_LIMIT) {
            return { blocked: true, reason: 'AML_VIOLATION: Amount exceeds limit' };
        }

        // Check for sanctions evasion
        if (decision.recipient) {
            const isSanctioned = this.SANCTIONS_LIST.some(banned =>
                decision.recipient.includes(banned)
            );
            if (isSanctioned) {
                return { blocked: true, reason: 'SANCTIONS_EVASION: Blacklisted address' };
            }
        }

        return { blocked: false };
    }
}

describe('Policy Engine Integration', () => {
    let agent: LogosAgent;
    let connection: Connection;
    let wallet: Keypair;

    beforeAll(() => {
        connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        wallet = Keypair.generate();
        agent = new LogosAgent({ connection, wallet });
    });

    describe('AML Limit Enforcement', () => {
        test('should APPROVE transfer below limit (99 SOL)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 99,
                recipient: 'GoodUser123'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(false);
            expect(result.reason).toBeUndefined();
        });

        test('should APPROVE transfer at exact limit (100 SOL)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 100,
                recipient: 'GoodUser123'
            };

            const result = PolicyEngine.evaluate(decision);

            // Note: 100 is NOT above limit, so it should be approved
            expect(result.blocked).toBe(false);
        });

        test('should BLOCK transfer above limit (100.01 SOL)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 100.01,
                recipient: 'GoodUser123'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('AML_VIOLATION');
        });

        test('should BLOCK extreme rug pull (10000 SOL)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 10000,
                recipient: 'AttackerWallet'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('AML_VIOLATION');
        });
    });

    describe('Sanctions List Enforcement', () => {
        test('should APPROVE transfer to normal address', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 50,
                recipient: 'NormalUserWallet'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(false);
        });

        test('should BLOCK transfer to TornadoCash', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 50,
                recipient: 'TornadoCash_Mixer_Address'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('SANCTIONS_EVASION');
        });

        test('should BLOCK transfer to known attacker', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 1,
                recipient: 'AttackerWallet_8xg1'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('SANCTIONS_EVASION');
        });
    });

    describe('Boundary Conditions', () => {
        test('should handle edge case: exactly 0 SOL', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 0,
                recipient: 'TestAddress'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(false);
        });

        test('should handle edge case: negative amount (invalid)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: -50,
                recipient: 'TestAddress'
            };

            // Policy engine doesn't explicitly check for negative (would be caught by on-chain validation)
            const result = PolicyEngine.evaluate(decision);
            expect(result.blocked).toBe(false); // Would fail on-chain anyway
        });

        test('should handle floating point precision (99.999999 SOL)', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 99.999999,
                recipient: 'TestAddress'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(false);
        });

        test('should handle missing fields gracefully', async () => {
            const decision = {
                action: 'UNKNOWN'
                // Missing amount and recipient
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(false); // No rule violated
        });
    });

    describe('Combined Violations', () => {
        test('should BLOCK when both AML and sanctions violated', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 5000,
                recipient: 'TornadoCash_Mixer'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            // Should catch AML first (short-circuit evaluation)
            expect(result.reason).toContain('AML_VIOLATION');
        });

        test('should BLOCK sanctions even with low amount', async () => {
            const decision = {
                action: 'TRANSFER',
                amount: 1,
                recipient: 'Blacklisted_Entity'
            };

            const result = PolicyEngine.evaluate(decision);

            expect(result.blocked).toBe(true);
            expect(result.reason).toContain('SANCTIONS_EVASION');
        });
    });

    describe('Commit-Reveal with Policy Check', () => {
        test('should commit BLOCKED decision and verify later', async () => {
            const blockedDecision = {
                action: 'TRANSFER',
                amount: 10000,
                recipient: 'AttackerWallet'
            };

            const policyResult = PolicyEngine.evaluate(blockedDecision);
            expect(policyResult.blocked).toBe(true);

            // Even blocked decisions can be committed (for audit trail)
            const topicId = 'BLOCKED-TEST-' + Date.now();
            const commitResult = await agent.commit(blockedDecision, topicId, { dryRun: true });

            expect(commitResult.commitment).toBeTruthy();
            expect(commitResult.salt).toBeTruthy();

            // Later reveal should still match (even though it was blocked)
            const revealResult = await agent.reveal(blockedDecision, topicId, commitResult.salt, { dryRun: true });
            expect(revealResult.commitment).toBe(commitResult.commitment);

            // Note: In production, the BLOCKED status would be logged in Memo
            // {"v": 1, "type": "logos_log", "status": "BLOCKED", "reason": "AML_VIOLATION"}
        });
    });
});
