// src/handlers/keihi/report/storeCsvExport.js
// ----------------------------------------------------
// 店舗ごとの経費データを CSV 出力する処理
//   - ボタン押下: 店舗選択セレクトを表示
//   - 店舗選択: 今月分の承認済みデータを CSV で返す
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');

const { loadKeihiDailyData } = require('../../../utils/keihi/gcsKeihiManager');
const { loadKeihiConfig } = require('../../../utils/keihi/keihiConfigManager');
const { loadStoreRoleConfig } = require('../../../utils/config/storeRoleConfigManager');
const { resolveStoreName } = require('./panel');
const logger = require('../../../utils/logger');

// ボタンとセレクトの customId 定義
// パネル側のボタン customId は `KEIHI_CSV_BUTTON_PREFIX` で始まるようにしておく
const KEIHI_CSV_BUTTON_PREFIX = 'keihi_store_csv_btn';
const KEIHI_CSV_SELECT_MENU_ID = 'keihi_store_csv_select';

// ----------------------------------------------------
// エントリーポイント
//   - interactionCreate → keihiBotHandler → ここ
// ----------------------------------------------------
/**
 * @param {import('discord.js').Interaction} interaction
 */
async function handleStoreCsvExport(interaction) {
  // ボタン: 店舗選択セレクトを出す
  if (interaction.isButton()) {
    return handleCsvButton(interaction);
  }

  // セレクトメニュー: 店舗決定 → CSV生成
  if (interaction.isAnySelectMenu()) {
    if (interaction.customId === KEIHI_CSV_SELECT_MENU_ID) {
      return handleStoreSelect(interaction);
    }
  }

  return;
}

// ----------------------------------------------------
// 1) 「店舗CSV出力」ボタン押下時
//   店舗一覧セレクトを表示する
// ----------------------------------------------------
/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleCsvButton(interaction) {
  const { guild } = interaction;
  const guildId = guild.id;

  try {
    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    const panels = keihiConfig.panels || {};
    const storeIds = Object.keys(panels);

    if (!storeIds.length) {
      await interaction.reply({
        content: '店舗ごとの経費パネル設定が見つかりません。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(KEIHI_CSV_SELECT_MENU_ID)
      .setPlaceholder('CSV を出力する店舗を選択してください')
      .setMinValues(1)
      .setMaxValues(1);

    for (const storeId of storeIds) {
      const storeName = resolveStoreName(storeRoleConfig, storeId) || storeId;
      select.addOptions({
        label: storeName.slice(0, 100),
        value: storeId,
      });
    }

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: '店舗を選択してください。（今月分の承認済み経費を CSV 出力します）',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (e) {
    logger.error('[keihi/storeCsvExport] 店舗セレクト表示中にエラー:', e);
    await interaction.reply({
      content: '店舗CSV出力の準備中にエラーが発生しました。',
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
  }
}

// ----------------------------------------------------
// 2) 店舗セレクト送信 → 今月分の承認済みレコードを集計して CSV 出力
// ----------------------------------------------------
/**
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleStoreSelect(interaction) {
  const { guild, values } = interaction;
  const guildId = guild.id;
  const storeId = values[0];

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const [keihiConfig, storeRoleConfig] = await Promise.all([
      loadKeihiConfig(guildId),
      loadStoreRoleConfig(guildId).catch(() => null),
    ]);

    const storeName = resolveStoreName(storeRoleConfig, storeId) || storeId;
    const guildName = guild.name;

    // 今月の YYYY-MM を計算
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `${yyyy}-${mm}`;

    // 今月1日〜末日までの日別データを読み込む
    const records = [];
    const firstDay = new Date(yyyy, now.getMonth(), 1);
    const nextMonth = new Date(yyyy, now.getMonth() + 1, 1);

    for (let d = new Date(firstDay); d < nextMonth; d.setDate(d.getDate() + 1)) {
      const dY = d.getFullYear();
      const dM = String(d.getMonth() + 1).padStart(2, '0');
      const dD = String(d.getDate()).padStart(2, '0');
      const dateStr = `${dY}-${dM}-${dD}`;

      // 日別ファイルをロード（存在しなければ null が返る想定）
      // ここではステータス "APPROVED" のレコードだけを対象
      // ※ loadKeihiDailyData 自体は utils 側で local/GCS を見てくれる
      // eslint-disable-next-line no-await-in-loop
      const dailyData = await loadKeihiDailyData(guildId, storeId, dateStr).catch(
        () => null,
      );
      if (!dailyData || !Array.isArray(dailyData.requests)) continue;

      for (const r of dailyData.requests) {
        if (!r || r.status !== 'APPROVED') continue;
        records.push({
          ...r,
          date: r.date || dateStr,
        });
      }
    }

    if (!records.length) {
      await interaction.editReply({
        content: `店舗「${storeName}」の ${monthKey} に承認済みの経費申請はありません。`,
      });
      return;
    }

    // ユーザー名解決用：一度だけ全メンバーを取得してキャッシュ
    const memberCache = new Map();
    const allMembers = await guild.members.fetch();
    for (const m of allMembers.values()) {
      memberCache.set(m.id, m);
    }

    const getDisplayName = (userId, fallbackMention) => {
      if (!userId) return fallbackMention || '';
      const m = memberCache.get(userId);
      if (m) return m.displayName || m.user.username || fallbackMention || '';
      return fallbackMention || '';
    };

    // CSVヘッダ（ID類は出さず、名前だけ）
    const header = [
      'ギルド名',
      '店舗名',
      '日付',
      '部署',
      '経費項目',
      '金額',
      '備考',
      '申請者',
      '承認者',
      '承認日時(ISO)',
    ];

    const csvLines = [header.join(',')];

    for (const r of records) {
      const requesterName = getDisplayName(r.requesterId, r.requester);
      const approverName = getDisplayName(r.approvedById, r.approvedBy);

      const row = [
        guildName,
        storeName,
        r.date || '',
        r.department || '',
        r.item || '',
        String(r.amount || 0),
        (r.note || '').replace(/\r?\n/g, ' '),
        requesterName,
        approverName,
        r.approvedAt || '',
      ];

      // CSVエスケープ（カンマ・改行を含むときはダブルクォートで囲む）
      const escaped = row.map((value) => {
        const str = value == null ? '' : String(value);
        if (/[",\r\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });

      csvLines.push(escaped.join(','));
    }

    const csvText = csvLines.join('\n');
    const buffer = Buffer.from(csvText, 'utf8');
    const fileName = `keihi_${storeId}_${monthKey}.csv`;

    const attachment = new AttachmentBuilder(buffer, { name: fileName });

    await interaction.editReply({
      content: `店舗「${storeName}」の ${monthKey} の承認済み経費を CSV 出力しました。`,
      files: [attachment],
    });
  } catch (e) {
    logger.error('[keihi/storeCsvExport] 店舗CSV出力中にエラー:', e);
    await interaction.editReply({
      content: '店舗CSV出力中にエラーが発生しました。コンソールログを確認してください。',
    }).catch(() => {});
  }
}

module.exports = {
  KEIHI_CSV_BUTTON_PREFIX,
  KEIHI_CSV_SELECT_MENU_ID,
  handleStoreCsvExport,
};
