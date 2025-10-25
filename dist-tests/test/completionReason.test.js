/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { test } from "node:test";
import assert from "node:assert";
function determineCompletionReason(ctx) {
    if (ctx.errorBudgetExceeded) {
        return "error_budget";
    }
    if (ctx.maxPages > 0 && ctx.pageCount >= ctx.maxPages) {
        return "capped";
    }
    if (ctx.gracefulShutdown) {
        return "manual";
    }
    return "finished";
}
test("completionReason - finished when queue empty naturally", () => {
    const result = determineCompletionReason({
        maxPages: 100,
        pageCount: 5,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - finished when maxPages is 0 (unlimited)", () => {
    const result = determineCompletionReason({
        maxPages: 0,
        pageCount: 1000,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - capped when pageCount equals maxPages", () => {
    const result = determineCompletionReason({
        maxPages: 10,
        pageCount: 10,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "capped");
});
test("completionReason - capped when pageCount exceeds maxPages", () => {
    const result = determineCompletionReason({
        maxPages: 10,
        pageCount: 15,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "capped");
});
test("completionReason - capped at boundary (maxPages=1, pageCount=1)", () => {
    const result = determineCompletionReason({
        maxPages: 1,
        pageCount: 1,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "capped");
});
test("completionReason - manual when gracefulShutdown", () => {
    const result = determineCompletionReason({
        maxPages: 100,
        pageCount: 5,
        gracefulShutdown: true,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "manual");
});
test("completionReason - manual overrides natural finish", () => {
    const result = determineCompletionReason({
        maxPages: 0,
        pageCount: 5,
        gracefulShutdown: true,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "manual");
});
test("completionReason - error_budget takes priority", () => {
    const result = determineCompletionReason({
        maxPages: 10,
        pageCount: 5,
        gracefulShutdown: false,
        errorBudgetExceeded: true
    });
    assert.strictEqual(result, "error_budget");
});
test("completionReason - error_budget over capped", () => {
    const result = determineCompletionReason({
        maxPages: 10,
        pageCount: 10,
        gracefulShutdown: false,
        errorBudgetExceeded: true
    });
    assert.strictEqual(result, "error_budget");
});
test("completionReason - error_budget over manual", () => {
    const result = determineCompletionReason({
        maxPages: 100,
        pageCount: 5,
        gracefulShutdown: true,
        errorBudgetExceeded: true
    });
    assert.strictEqual(result, "error_budget");
});
test("completionReason - capped over manual", () => {
    const result = determineCompletionReason({
        maxPages: 10,
        pageCount: 10,
        gracefulShutdown: true,
        errorBudgetExceeded: false
    });
    // Current logic: capped takes priority over manual
    assert.strictEqual(result, "capped");
});
test("completionReason - zero pages crawled", () => {
    const result = determineCompletionReason({
        maxPages: 100,
        pageCount: 0,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - negative maxPages treated as unlimited", () => {
    // If maxPages is somehow negative, should be treated as unlimited
    const result = determineCompletionReason({
        maxPages: -1,
        pageCount: 100,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - large pageCount with no limit", () => {
    const result = determineCompletionReason({
        maxPages: 0,
        pageCount: 999999,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - maxPages=1000000, pageCount=999999", () => {
    const result = determineCompletionReason({
        maxPages: 1000000,
        pageCount: 999999,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "finished");
});
test("completionReason - maxPages=1000000, pageCount=1000000", () => {
    const result = determineCompletionReason({
        maxPages: 1000000,
        pageCount: 1000000,
        gracefulShutdown: false,
        errorBudgetExceeded: false
    });
    assert.strictEqual(result, "capped");
});
//# sourceMappingURL=completionReason.test.js.map