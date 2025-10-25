import test from 'node:test';
import assert from 'node:assert/strict';
import { init, tryConsume, getTokens, _reset } from '../src/core/perHostTokens.js';
test('initializes buckets and consumes tokens', () => {
    _reset();
    init({ perHostRps: 2 });
    const now = 1000000;
    assert.equal(tryConsume('a.com', now), true);
    assert.ok(getTokens('a.com') < 2);
});
test('refills tokens over time and clamps to burst', () => {
    _reset();
    init({ perHostRps: 2 });
    const now = 1000000;
    tryConsume('a.com', now);
    assert.ok(getTokens('a.com') < 2);
    // After 2 seconds, should refill to burst
    assert.equal(tryConsume('a.com', now + 2000), true);
    assert.ok(getTokens('a.com') <= 2);
});
test('does not consume if tokens are depleted', () => {
    // Edge case: zero tokens cannot consume, deterministic refill
    _reset();
    init({ perHostRps: 2, burst: 2 }); // 2 tokens max; 2 tokens per second
    const host = 'caifrazier.com';
    const t0 = 1_000; // ms baseline
    // Drain both tokens at t0
    assert.equal(tryConsume(host, t0), true, 'first token should consume');
    assert.equal(tryConsume(host, t0), true, 'second token should consume');
    // Still t0: should NOT consume, tokens=0
    assert.equal(tryConsume(host, t0), false, 'should not consume when empty');
    assert.equal(getTokens(host) >= 0 && getTokens(host) < 1, true, 'no full token yet');
    // After 250ms at 2 rps, tokens ~0.5 — still not enough
    assert.equal(tryConsume(host, t0 + 250), false, 'should not consume at half token');
    // After 500ms, tokens ~1 — now allowed
    assert.equal(tryConsume(host, t0 + 500), true, 'should consume after refill to >=1');
});
test('supports custom burst', () => {
    _reset();
    init({ perHostRps: 2, burst: 5 });
    const now = 1000000;
    for (let i = 0; i < 5; i++)
        assert.equal(tryConsume('c.com', now), true);
    assert.equal(tryConsume('c.com', now), false);
});
//# sourceMappingURL=perHostTokens.test.js.map