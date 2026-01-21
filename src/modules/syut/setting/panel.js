const { getSyutConfig, saveSyutConfig } = require('../../../utils/syut/syutConfigManager');
const { buildPanel } = require('../../../utils/ui/panelBuilder');
const { SYUT_SETTING_PANEL_SCHEMA } = require('./panelSchema');

/**
 * 出退勤設定パネルを設置・更新
 */
async function postSyutPanel(channel) {
  const guildId = channel.guild.id;
  const config = await getSyutConfig(guildId);

  // データマッピング
  const dataMap = {
    castPanels: formatPanelList(config.castPanelList),
    kuroPanels: formatPanelList(config.kurofukuPanelList),
    lastUpdated: config.lastUpdated
      ? `<t:${Math.floor(new Date(config.lastUpdated).getTime() / 1000)}:f>`
      : '未設定',
  };

  // スキーマからフィールドを生成
  const embedFields = SYUT_SETTING_PANEL_SCHEMA.fields.map(f => ({
    name: f.name,
    value: dataMap[f.key] || f.fallback
  }));

  // パネル構築
  const panel = buildPanel({
    title: SYUT_SETTING_PANEL_SCHEMA.title,
    description: SYUT_SETTING_PANEL_SCHEMA.description,
    color: SYUT_SETTING_PANEL_SCHEMA.color,
    fields: embedFields,
    buttons: SYUT_SETTING_PANEL_SCHEMA.buttons,
    footer: '出退勤設定パネル - 更新可能',
    timestamp: true
  });

  // 既存のパネルを探して更新、なければ新規投稿
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existingPanel = messages?.find(m =>
    m.author.id === channel.client.user.id &&
    m.embeds[0]?.title === SYUT_SETTING_PANEL_SCHEMA.title
  );

  if (existingPanel) {
    await existingPanel.edit(panel);
  } else {
    await channel.send(panel);
  }

  // 更新情報保存
  config.lastUpdated = new Date().toISOString();
  await saveSyutConfig(guildId, config);
}

/**
 * パネル一覧をフォーマット
 */
function formatPanelList(list) {
  if (!list || Object.keys(list).length === 0) return '未設定';
  return Object.entries(list).map(([store, value]) => {
    let channelLink = '（情報なし）';
    if (typeof value === 'string') {
      channelLink = value;
    } else if (typeof value === 'object' && value.channel) {
      channelLink = value.channel;
    }
    return `・${store}：${channelLink}`;
  }).join('\n');
}

module.exports = { postSyutPanel };
