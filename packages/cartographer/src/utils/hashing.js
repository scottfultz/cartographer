/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */
import { createHash } from "crypto";
/**
 * Compute SHA-256 hash of string or buffer
 */
export function sha256(input) {
    return createHash("sha256").update(input).digest("hex");
}
/**
 * Compute SHA-256 hash and return hex string (alias for clarity)
 */
export function sha256Hex(input) {
    return createHash("sha256").update(input).digest("hex");
}
/**
 * Compute SHA-1 hash (hex) for URL keys
 */
export function sha1Hex(input) {
    return createHash("sha1").update(input).digest("hex");
}
//# sourceMappingURL=hashing.js.map