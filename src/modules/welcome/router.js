/**
 * src/modules/welcome/router.js
 * ようこそモジュールのルーティング
 */

const InteractionRouter = require('../../structures/InteractionRouter');
const { IDS } = require('./ui/panelSchema');

// Handlers
const refreshPanelHandler = require('./handlers/RefreshPanelHandler');
const setChannel = require('./handlers/SetChannelHandler');
const setMessage = require('./handlers/SetMessageHandler');
const imageMenu = require('./handlers/ImageMenuHandler');
const imageManage = require('./handlers/ImageManageHandler');

const router = new InteractionRouter();

// パネル初期表示 / 更新
router.on(IDS.PANEL_REFRESH, refreshPanelHandler);

// チャンネル設定
router.on(IDS.BTN_SET_CHANNEL, setChannel.trigger);
router.on('welcome:channel:select_menu', setChannel.submit);

// メッセージ設定
router.on(IDS.BTN_SET_MESSAGE, setMessage.trigger);
router.on('welcome:message:modal_submit', setMessage.submit);

// 画像設定
router.on(IDS.BTN_MANAGE_IMAGE, imageMenu.trigger);
router.on('welcome:image:toggle', imageMenu.toggle);
router.on('welcome:image:delete_select', imageMenu.delete);
router.on('welcome:image:add', imageManage.trigger);
router.on('welcome:image:add_submit', imageManage.submit);

module.exports = router;
