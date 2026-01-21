/**
 * src/handlers/interactionRegistry.js
 * customId のプレフィックスとハンドラーのマッピング
 */

module.exports = {
    // 設定
    'config': require('../modules/config').handleConfigInteraction,

    // 売上
    'uriage': require('../modules/uriage').handleUriageInteraction,

    // 経費
    'keihi': require('../modules/keihi').handleKeihiInteraction,

    // KPI
    'kpi': require('../modules/kpi').handleKpiInteraction,

    // 出退勤 (syut, cast, kuro)
    'syut': require('../modules/syut').handleSyutInteraction,
    'cast': require('../modules/syut').handleSyutInteraction,
    'kuro': require('../modules/syut').handleSyutInteraction,
    'role_select': require('../modules/syut').handleSyutInteraction, // syut module uses this

    // 店内状況・ひっかけ (tennai_hikkake)
    'tennai_hikkake': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction,
    'hikkake_report': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction,
    'hikkake_edit': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction,
    'setup_hikkake': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction,
    'select_store_for_hikkake': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction,
    'select_channel_for_hikkake': require('../modules/tennai_hikkake').handleTennaiHikkakeInteraction, // prefix match needed

    // くじ引き
    'kuzibiki': require('../modules/kuzibiki').handleKuzibikiInteraction,

    // ChatGPT
    'chatgpt': require('../modules/chat_gpt').handleChatGptInteraction,
    'chat_gpt': require('../modules/chat_gpt').handleChatGptInteraction,
};
