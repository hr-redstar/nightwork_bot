// src/utils/ui/featurePanelTemplate.js
// ----------------------------------------------------
// ① 機能別「設定パネル」
// ② 機能別「店舗パネル（申請/報告パネル）」
// 経費をベースに全機能で使い回すテンプレ
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const dayjs = require('dayjs');

/**
 * ① 機能別「設定パネル」テンプレ
 *
 * 例: /設定経費, /設定売上, /設定kpi ...
 */
function buildFeatureSettingPanel(options) {
  const {
    featureKey,            // 'keihi' / 'uriage' / 'kpi' / 'syut' など
    featureLabel,          // '経費' / '売上' / 'KPI' / '出退勤'
    storePanelLines = [],  // 「設置済みパネル一覧」の行
    approverRoleLines = [],// 「承認役職」の行
    extraLines = [],       // 機能ごとの追記事項
  } = options;

  const now = dayjs().format('YYYY/MM/DD HH:mm');

  const description = [
    `🏪 **${featureLabel}パネル設置店舗一覧**`,
    storePanelLines.length ? storePanelLines.join('\n') : '未設置',
    '',
    `✅ **${featureLabel}承認役職一覧**`,
    approverRoleLines.length ? approverRoleLines.join('\n') : '未設定',
    '',
    ...extraLines,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`⚙️ ${featureLabel}設定パネル`)
    .setDescription(description)
    .setFooter({ text: `${featureLabel}設定 ／ 最終更新: ${now}` });

  // 経費をベースにしたボタン構成
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:panel_setup`)
      .setLabel(`${featureLabel}パネル設置`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:set_approver_role`)
      .setLabel('承認役職設定')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:config:csv_export`)
      .setLabel(`${featureLabel}CSV出力`)
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

/**
 * ② 機能別「店舗パネル（申請/報告パネル）」テンプレ
 *
 * 例: 経費申請パネル / 売上報告パネル / KPIパネル ...
 */
function buildStoreMainPanel(options) {
  const {
    featureKey,            // 'keihi'
    featureLabel,          // '経費'
    storeName,             // '本店'
    logChannelMention = '未設定',
    applicantRoleMention = '未設定',
    approverRoleMention = '未設定',
    extraInfoLines = [],   // 期間・KPI目標など機能ごとの追記
    showItemRegister = false, // 経費のように「項目登録」がある場合
  } = options;

  const description = [
    `📝 **${featureLabel}ログチャンネル**`,
    logChannelMention,
    '',
    `👤 **申請役職**`,
    applicantRoleMention,
    '',
    `✅ **承認役職**`,
    approverRoleMention,
    '',
    ...extraInfoLines,
  ].join('\n');

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`${featureLabel}パネル ／ ${storeName}`)
    .setDescription(description)
    .setFooter({ text: `${featureLabel}パネル ／ 店舗: ${storeName}` });

  const buttons = [];

  // 経費 → 「経費申請」
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`${featureKey}:panel:request_open:${storeName}`)
      .setLabel(`${featureLabel}申請`)
      .setStyle(ButtonStyle.Primary),
  );

  // 経費 → 「経費項目登録」
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
  buildStoreMainPanel,
};
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