// src/utils/ui/featurePanelTemplate.js
// ----------------------------------------------------
// 機能ごとの「設定パネル」＆「店舗パネル」共通テンプレート
//   - 経費 / 売上 / KPI / 出退勤 / 店内状況 などで共通利用
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const dayjs = require('dayjs');

/**
 * ✅ 機能共通「設定パネル」テンプレート
 *
 * 経費の設定パネルイメージ：
 *  - タイトル: ⚙️ 経費設定パネル
 *  - 登録済み店舗一覧
 *  - 登録済み役職一覧
 *  - 店舗とロールの紐づけ
 *  - 役職とロールの紐づけ
 *  - ログ関連
 *  - Slack通知設定
 *  - 各種ボタン
 *
 * @param {Object} options
 * @param {string} options.featureKey      - 機能キー (例: 'keihi', 'uriage', 'kpi', 'syut')
 * @param {string} options.featureLabel    - 機能名 (例: '経費', '売上', 'KPI', '出退勤')
 * @param {string[]} [options.stores]      - 登録済み店舗名一覧
 * @param {string[]} [options.roles]       - 登録済み役職名一覧
 * @param {string[]} [options.storeRoleSummaryLines] - 「店舗とロールの紐づけ」の表示用行配列
 * @param {string[]} [options.roleUserSummaryLines]  - 「役職とユーザーの紐づけ」の表示用行配列
 * @param {Object} [options.logConfig]     - ログ設定リンクなど
 * @param {string} [options.logConfig.globalLogMention]
 * @param {string} [options.logConfig.adminLogMention]
 * @param {string} [options.logConfig.commandLogThreadMention]
 * @param {string} [options.logConfig.settingLogThreadMention]
 * @param {Object} [options.slackConfig]   - Slack通知設定
 * @param {boolean} [options.slackConfig.enabled]
 * @param {string} [options.slackConfig.botName]
 * @param {string} [options.slackConfig.channelLabel]
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildFeatureSettingPanel(options) {
  const {
    featureKey,
    featureLabel,
    stores = [],
    roles = [],
    storeRoleSummaryLines = [],
    roleUserSummaryLines = [],
    logConfig = {},
    slackConfig = {},
  } = options;

  const {
    globalLogMention = '未設定',
    adminLogMention = '未設定',
    commandLogThreadMention = '未設定',
    settingLogThreadMention = '未設定',
  } = logConfig;

  const {
    enabled: slackEnabled = false,
    botName = '未設定',
    channelLabel = '未設定',
  } = slackConfig;

  const now = dayjs().format('YYYY/MM/DD HH:mm');

  // ---------- 本文組み立て ----------
  const storeLines =
    stores.length > 0 ? stores.map((s) => `・${s}`).join('\n') : '未登録';

  const roleLines =
    roles.length > 0 ? roles.map((r) => `・${r}`).join('\n') : '未登録';

  const storeRoleLines =
    storeRoleSummaryLines.length > 0
      ? storeRoleSummaryLines.join('\n')
      : '未設定';

  const roleUserLines =
    roleUserSummaryLines.length > 0
      ? roleUserSummaryLines.join('\n')
      : '未設定';

  const slackStatus = slackEnabled ? '✅ 有効' : '❌ 無効';

  const description =
    [
      `🏪 **登録済み店舗一覧**`,
      storeLines,
      '',
      `👥 **登録済み役職一覧**`,
      roleLines,
      '',
      `🏢 **店舗とロールの紐づけ**`,
      storeRoleLines,
      '',
      `👤 **役職とユーザーの紐づけ**`,
      roleUserLines,
      '',
      `📜 **ログ設定**`,
      `・グローバルログチャンネル：${globalLogMention}`,
      `・管理者ログチャンネル　　：${adminLogMention}`,
      `・コマンドログスレッド　　：${commandLogThreadMention}`,
      `・設定ログスレッド　　　　：${settingLogThreadMention}`,
      '',
      `🤖 **Slack通知自動化**`,
      `・ステータス：${slackStatus}`,
      `・bot名　　　：${botName}`,
      `・送信先　　　：${channelLabel}`,
    ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`⚙️ ${featureLabel}設定パネル`)
    .setDescription(description)
    .setFooter({ text: `${featureLabel}設定 ／ 最終更新: ${now}` });

  // ---------- ボタン行（経費をベースに汎用化） ----------
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:edit_store`)
      .setLabel('店舗名編集')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:edit_role`)
      .setLabel('役職編集')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:bind_store_role`)
      .setLabel('店舗とロールの紐づけ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:bind_role_user`)
      .setLabel('役職とユーザーの紐づけ')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:user_info`)
      .setLabel('ユーザー情報登録')
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:set_global_log`)
      .setLabel('グローバルログ設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:set_admin_log`)
      .setLabel('管理者ログ設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:set_command_log`)
      .setLabel('コマンドログスレッド設定')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:set_setting_log`)
      .setLabel('設定ログスレッド設定')
      .setStyle(ButtonStyle.Secondary),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:slack`)
      .setLabel('Slack通知')
      .setStyle(ButtonStyle.Success),
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3, row4],
  };
}

/**
 * ✅ 店舗ごとの「店舗パネル」テンプレート
 *
 * 経費の店舗パネルイメージ：
 *   - タイトル: 経費申請パネル（店舗名）
 *   - ログチャンネル / 申請役職 / 承認役職 表示
 *   - 「経費申請」「経費項目登録」ボタン
 *
 * @param {Object} options
 * @param {string} options.featureKey        - 機能キー (例: 'keihi')
 * @param {string} options.featureLabel      - 機能名 (例: '経費')
 * @param {string} options.storeName         - 店舗名
 * @param {string} [options.logChannelMention]  - ログチャンネルのメンション
 * @param {string} [options.applicantRoleMention] - 申請役職のメンション
 * @param {string} [options.approverRoleMention]  - 承認役職のメンション
 * @param {string} [options.viewerRoleMention]    - 閲覧役職のメンション
 * @param {boolean} [options.showItemRegister]    - 項目登録ボタンを表示するか
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function buildStorePanel(options) {
  const {
    featureKey,
    featureLabel,
    storeName,
    logChannelMention = '未設定',
    applicantRoleMention = '未設定',
    approverRoleMention = '未設定',
    viewerRoleMention = '未設定',
    showItemRegister = true,
  } = options;

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`${featureLabel}パネル ／ ${storeName}`)
    .setDescription(
      [
        `📝 **${featureLabel}ログチャンネル**`,
        logChannelMention,
        '',
        `👤 **申請役職**`,
        applicantRoleMention,
        '',
        `✅ **承認役職**`,
        approverRoleMention,
        '',
        `👀 **閲覧役職**`,
        viewerRoleMention,
      ].join('\n'),
    )
    .setFooter({ text: `${featureLabel}パネル ／ 店舗: ${storeName}` });

  const buttons = [];

  // 例: 経費 → 「経費申請」
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:panel:request_open:${storeName}`)
      .setLabel(`${featureLabel}申請`)
      .setStyle(ButtonStyle.Primary),
  );

  // 例: 経費 → 「経費項目登録」
  if (showItemRegister) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`${featureKey}:item:register:${storeName}`)
        .setLabel(`${featureLabel}項目登録`)
        .setStyle(ButtonStyle.Secondary),
    );
  }

  const row = new ActionRowBuilder().addComponents(buttons);

  return {
    embeds: [embed],
    components: [row],
  };
}

module.exports = {
  buildFeatureSettingPanel,
  buildStorePanel,
};