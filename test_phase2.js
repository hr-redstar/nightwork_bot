/**
 * test_phase2.js
 * Phase 2: Interaction Router Automation Verification Script
 */

const path = require('path');
const AppRouter = require('./src/structures/AppRouter');

async function runTests() {
    console.log('--- Phase 2 Verification Start ---');

    const modulesDir = path.resolve(__dirname, 'src/modules');
    console.log(`[Test] Loading modules from: ${modulesDir}`);

    // 1. Load Modules
    AppRouter.loadModules(modulesDir);

    // Check if Keihi, Uriage, Config, Syut, Kpi, TennaiHikkake are registered
    const registeredNames = AppRouter.modules.map(m => m.name);
    console.log('[Test] Registered Modules:', registeredNames);

    const required = ['keihi', 'uriage', 'config', 'syut', 'kpi', 'tennai_hikkake'];
    const missing = required.filter(r => !registeredNames.includes(r));

    if (missing.length === 0) {
        console.log('✅ Auto-discovery working for ALL main modules');
    } else {
        console.error('❌ Auto-discovery failed. Missing:', missing);
    }

    // 2. Load Legacy Registry (Skipped - Legacy Registry Removed)
    const afterLegacyCount = AppRouter.modules.length;
    console.log(`[Test] Total Modules: ${afterLegacyCount}`);

    // 3. Dispatch Test Mock
    console.log('\n[Test 3] Dispatch Simulation');

    // Function to create mock interaction
    const createMock = (customId) => ({
        customId,
        user: { id: 'test_user', tag: 'TestUser#0000' },
        guild: { name: 'TestGuild' },
        isButton: () => true,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        isChatInputCommand: () => false,
        reply: async (msg) => console.log(`   -> Reply: ${JSON.stringify(msg)}`),
        update: async (msg) => console.log(`   -> Update: ${JSON.stringify(msg)}`),
        deferUpdate: async () => console.log(`   -> DeferUpdate`),
        followUp: async (msg) => console.log(`   -> FollowUp: ${JSON.stringify(msg)}`),
    });

    // Mock handlers to avoid actual side effects (DB, API)
    AppRouter.modules.forEach(m => {
        m.handler = async (i) => {
            console.log(`   ✅ Handler invoked for module [${m.name}] on ID [${i.customId}]`);
        };
    });

    // Test Cases
    const testCases = [
        'keihi:setting:panel:refresh',
        'uriage:test',
        'config:store:add',
        'syut:attendance', // Now Auto-Discovered
        'kpi:apply:start', // Now Auto-Discovered
        'hikkake_report_123', // Now Auto-Discovered
        'unknown:action'   // Should fail
    ];

    for (const id of testCases) {
        console.log(`Testing dispatch: "${id}"`);
        const handled = await AppRouter.dispatch(createMock(id));
        if (handled) {
            console.log(`   -> Result: HANDLED`);
        } else {
            console.log(`   -> Result: UNHANDLED`);
        }
    }

    console.log('\n--- Verification Complete ---');
}

runTests().catch(console.error);
