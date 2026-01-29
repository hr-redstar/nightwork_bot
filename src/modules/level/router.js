/**
 * src/modules/level/router.js
 * レベル機能の全インタラクションルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const { IDS } = require('./ui/panelSchema');

// Handlers
const refreshPanelHandler = require('./handlers/RefreshPanelHandler');
const setChannel = require('./handlers/SetChannelHandler');
const setMessage = require('./handlers/SetMessageHandler');
const xpChat = require('./handlers/XpChatHandler');
const xpVc = require('./handlers/XpVcHandler');
const xpWork = require('./handlers/XpWorkHandler');
const rankingPanel = require('./handlers/RankingPanelHandler');

const router = new InteractionRouter();

// パネル初期表示 / 更新
router.on(IDS.PANEL_REFRESH, refreshPanelHandler);

// チャンネル設定
router.on(IDS.BTN_SET_CHANNEL, setChannel.trigger);
router.on('level:channel:select_menu', setChannel.submit);

// メッセージ設定
router.on(IDS.BTN_SET_MESSAGE, setMessage.trigger);
router.on('level:message:modal_submit', setMessage.submit);

// XP設定 (チャット)
router.on(IDS.BTN_XP_CHAT, xpChat.trigger);
router.on('level:xp:chat:modal_submit', xpChat.submit);

// XP設定 (VC)
router.on(IDS.BTN_XP_VC, xpVc.trigger);
router.on('level:xp:vc:modal_submit', xpVc.submit);

// XP設定 (出勤 - 準備中)
router.on(IDS.BTN_XP_WORK, xpWork);

// レベルランキングパネル (準備中)
router.on(IDS.BTN_RANKING_PANEL, rankingPanel);

module.exports = router;
