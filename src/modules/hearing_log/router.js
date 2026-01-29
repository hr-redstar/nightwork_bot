/**
 * src/modules/hearing_log/router.js
 * ヒアリングログ内部ルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const { postHearingSettingPanel, sendTargetChannelSelect } = require('./ui/panel');
const { showReportModal, handleModalSubmit } = require('./handlers/ReportHandler');
const { showSearchMenu, handleSearchTypeSelect, executeSearch } = require('./handlers/SearchHandler');
const repo = require('./HearingRepository');

const router = new InteractionRouter();

// --- 設定系 ---
router.on('hearing:setting:set_channel', async (interaction) => {
    await sendTargetChannelSelect(interaction);
});

router.on('hearing:setting:select_channel', async (interaction) => {
    const channelId = interaction.values[0];
    const config = await repo.getConfig(interaction.guildId);
    config.targetChannelId = channelId;
    await repo.saveConfig(interaction.guildId, config);

    await postHearingSettingPanel(interaction);
});

// --- 報告系 ---
router.on('hearing:report:start', async (interaction) => {
    await showReportModal(interaction);
});

router.on('hearing:report:modal_submit', async (interaction) => {
    await handleModalSubmit(interaction);
});

// --- 検索系 ---
router.on('hearing:search:menu', async (interaction) => {
    await showSearchMenu(interaction);
});

router.on('hearing:search:type:date', async (interaction) => {
    await handleSearchTypeSelect(interaction, 'date');
});

router.on('hearing:search:type:cast', async (interaction) => {
    await handleSearchTypeSelect(interaction, 'cast');
});

router.on('hearing:search:type:content', async (interaction) => {
    await handleSearchTypeSelect(interaction, 'content');
});

router.on('hearing:search:modal:keyword', async (interaction) => {
    await executeSearch(interaction, 'content', interaction.fields.getTextInputValue('keyword'));
});

router.on('hearing:search:execute:date', async (interaction) => {
    await executeSearch(interaction, 'date', interaction.values[0]);
});

router.on('hearing:search:execute:cast', async (interaction) => {
    await executeSearch(interaction, 'cast', interaction.values[0]);
});

module.exports = router;
