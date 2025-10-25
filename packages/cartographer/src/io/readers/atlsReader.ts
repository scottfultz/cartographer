/*
 * Copyright © 2025 Cai Frazier.
 * All rights reserved. Unauthorized copying, modification, or distribution is prohibited.
 * Proprietary and confidential.
 */

/**
 * Re-export Atlas SDK reader for backward compatibility
 * 
 * This shim allows the cartographer engine to use the Atlas SDK reader
 * through the monorepo workspace dependency.
 */

export * from '@atlas/sdk';
