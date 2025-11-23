// src/handlers/keihi/request/KeihiPanel_Request.js
// ----------------------------------------------------
// 経費申請パネル（店舗ごと）を設置・再描画する処理
// ----------------------------------------------------

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const logger = require("../../../utils/logger");
const { loadKeihiConfig } = require("../../../utils/keihi/keihiConfigManager");
const { rowKeihiRequest } = require("../components/keihiButtons");

/**
 * 経費申請パネルの embed + components を組み立てる
 * → 新規送信でも再描画でも共通で使う
 *
 * 経費申請パネル 店舗名
 *
 * スレッド閲覧役職
 * 役職：メンションロール
 *
 * 申請役職
 * 役職：メンションロール
 *
 * 経費項目
 *
 * ボタン1列目：経費項目登録 / 閲覧役職 / 申請役職
 * ボタン2列目：経費申請
 *
 * @param {import('discord.js').Guild} guild
 * @param {string} store
 * @returns {Promise<{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }>}
 */
async function buildKeihiReportPayload(guild, store) {
  const guildId = guild.id;

  const keihiConfig = await loadKeihiConfig(guildId);

  const threadViewRolesByStore = keihiConfig.threadViewRolesByStore || {};
  const applyRolesByStore = keihiConfig.applyRolesByStore || {};
  const itemsByStore = keihiConfig.itemsByStore || {};

  const threadViewRoles = threadViewRolesByStore[store] || [];
  const applyRoles = applyRolesByStore[store] || keihiConfig.applyRoles || [];
  const items = itemsByStore[store] || [];

  const formatRoles = async (roleIds) => {
    if (!roleIds || !roleIds.length) return "未設定";
    const roleMentions = await Promise.all(
      roleIds.map(async (id) => {
        const role = await guild.roles.fetch(id).catch(() => null);
        return role ? role.toString() : "`削除済みロール`";
      })
    );
    return roleMentions
      .join("　");
  };

  const itemsText = items.length
    ? items.map((name, idx) => `${idx + 1}. ${name}`).join("\n")
    : "未設定";

  const embed = new EmbedBuilder()
    .setTitle(`💰 経費申請パネル - ${store}`)
    .setColor(0x2ecc71)
    .setDescription("この店舗の経費申請・項目設定を行います。")
    .addFields(
      {
        name: "👁️ スレッド閲覧役職",
        value: `役職：${await formatRoles(threadViewRoles)}`,
      },
      {
        name: "📝 申請役職",
        value: `役職：${await formatRoles(applyRoles)}`,
      },
      {
        name: "📑 経費項目",
        value: itemsText,
      }
    );

  // ボタン1列目：経費項目登録 / 閲覧役職 / 申請役職
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`keihi_item:${store}`)
      .setLabel("🧾 経費項目登録")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`keihi_view_role:${store}`)
      .setLabel("👁️ 閲覧役職")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`keihi_apply_role:${store}`)
      .setLabel("📝 申請役職")
      .setStyle(ButtonStyle.Secondary)
  );

  // ボタン2列目：経費申請
  const row2 = rowKeihiRequest(store);

  return {
    embeds: [embed],
    components: [row1, row2],
  };
}

/**
 * 経費申請パネルを指定チャンネルに新規送信
 * @param {import('discord.js').TextChannel} channel
 * @param {{ store: string }} options
 */
async function postKeihiReportPanel(channel, { store }) {
  try {
    const payload = await buildKeihiReportPayload(channel.guild, store);
    const message = await channel.send(payload);
    return message;
  } catch (err) {
    logger.error("[KeihiPanel_Request] 経費申請パネル送信エラー:", err);
    throw err;
  }
}

module.exports = {
  buildKeihiReportPayload,
  postKeihiReportPanel,
};
