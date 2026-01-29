/**
 * src/modules/sougei/router.js
 * 送迎管理ルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const { postSougeiSettingPanel } = require('./ui/panel');
const { showRoleSelectForFeature, handleRoleSelectedForFeature } = require('../../events/panelFlowHelper');
const repo = require('./SougeiRepository');

const router = new InteractionRouter();

// --- 設定系 ---
router.on('sougei:setting:refresh', async (interaction) => {
    await postSougeiSettingPanel(interaction);
});

router.on('sougei:setting:set_role', async (interaction) => {
    await showRoleSelectForFeature(interaction, {
        customId: 'sougei:config:select:role:sougei',
        typeLabel: '送迎者役職',
        multiple: true
    });
});

router.on('sougei:config:select:role:sougei', async (interaction) => {
    await handleRoleSelectedForFeature(interaction, {
        loadFeatureConfig: async (guildId) => await repo.getConfig(guildId),
        saveFeatureConfig: async (guildId, config) => await repo.saveConfig(guildId, config),
        labelMap: { sougei: '送迎者役職' },
        applyPermissionCallback: null // とりあえず権限変更はなし
    });

    // パネルを更新
    await postSougeiSettingPanel(interaction);
});

module.exports = router;
