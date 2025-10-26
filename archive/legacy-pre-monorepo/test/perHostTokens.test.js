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
    _reset();
    init({ perHostRps: 1 });
    const now = 1000000;
    assert.equal(tryConsume('b.com', now), true);
    assert.equal(tryConsume('b.com', now), false);
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