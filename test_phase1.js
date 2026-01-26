/**
 * test_phase1.js
 * Phase 1: Core Stability & Abstraction Verification Script
 */

const { z } = require('zod');
const fs = require('fs/promises');
const path = require('path');
const StorageFactory = require('./src/utils/storage/StorageFactory');
const ConfigManager = require('./src/config/ConfigManager');
const { buildCustomId } = require('./src/utils/customId');

async function runTests() {
    console.log('--- Phase 1 Verification Start ---');

    // 1. Storage Factory & LocalStorage Test
    console.log('\n[Test 1] Storage Factory & LocalStorage');
    const storage = StorageFactory.getInstance();
    const testFile = 'test_data/config.json';
    const testData = { key: 'value', timestamp: Date.now() };

    try {
        await storage.saveJSON(testFile, testData);
        console.log('✅ Save JSON successful');

        const loaded = await storage.readJSON(testFile);
        if (loaded && loaded.key === testData.key) {
            console.log('✅ Read JSON successful');
        } else {
            console.error('❌ Read JSON failed or mismatch', loaded);
        }
    } catch (err) {
        console.error('❌ Storage test failed:', err);
    }

    // 2. ConfigManager & Zod Validation Test
    console.log('\n[Test 2] ConfigManager & Zod Validation');
    const TestSchema = z.object({
        name: z.string(),
        count: z.number().min(0),
    });

    const configManager = new ConfigManager({
        baseDir: 'test_config',
        fileName: 'settings.json',
        schema: TestSchema,
    }); // Storage is auto-injected from Factory

    // Valid Data
    try {
        await configManager.saveGlobal('guild123', { name: 'Bot', count: 10 });
        console.log('✅ Valid config saved');
    } catch (err) {
        console.error('❌ Valid config save failed:', err);
    }

    // Invalid Data
    try {
        await configManager.saveGlobal('guild123', { name: 'Bot', count: -5 }); // Negative count is invalid
        console.error('❌ Invalid config SHOULD have failed but passed');
    } catch (err) {
        if (err instanceof z.ZodError) {
            console.log('✅ Invalid config caught by Zod:', err.errors[0].message);
        } else {
            console.log('✅ Invalid config caught (other error):', err.message);
        }
    }

    // 3. CustomID Validation Test
    console.log('\n[Test 3] CustomID Validation');
    try {
        const id = buildCustomId({ domain: 'test', action: 'run', target: 'now' });
        console.log(`✅ Valid CustomID: ${id}`);
    } catch (err) {
        console.error('❌ Valid CustomID failed:', err);
    }

    try {
        buildCustomId({ domain: '', action: 'run' }); // Empty domain
        console.error('❌ Invalid CustomID SHOULD have failed');
    } catch (err) {
        console.log('✅ Invalid CustomID (empty domain) caught:', err.message);
    }

    try {
        // approx 101 chars
        const longId = buildCustomId({ domain: 'a', action: 'b', target: 'c'.repeat(100) });
        console.error('❌ Long CustomID SHOULD have failed');
    } catch (err) {
        console.log('✅ Long CustomID caught:', err.message);
    }

    // Cleanup
    try {
        // await fs.rm(path.resolve('local_data', 'gcs', 'test_data'), { recursive: true, force: true });
        // await fs.rm(path.resolve('local_data', 'gcs', 'test_config'), { recursive: true, force: true });
        console.log('\n--- Verification Complete (Artifacts left in local_data/gcs for inspection) ---');
    } catch (e) {
        console.warn('Cleanup warning:', e);
    }
}

runTests().catch(console.error);
