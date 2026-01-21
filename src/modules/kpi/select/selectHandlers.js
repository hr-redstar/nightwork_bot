// modules/kpi/select/selectHandlers.js
// ----------------------------------------------------
// KPI SelectMenu 処理
//  - 店舗選択
//  - チャンネル選択
//  - 役職選択
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const logger = require('../../../utils/logger');

// 仮ストア（後でDB / JSONに置き換え）
const kpiConfigStore = require('../store/kpiConfigStore');

// 再表示用
const {
  sendKpiSettingPanel,
} = require('../setting/sendKpiSettingPanel');

// ====================================================
// 店舗選択 → 次にチャンネル選択
// ====================================================
async function handleSelectStore(interaction) {
  try {
    const storeId = interaction.values[0];
    const { guild } = interaction;

    // 一時保存（guild + store）
    await kpiConfigStore.setTemp(guild.id, {
      storeId,
    });

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('kpi:select:channel')
        .setPlaceholder('KPIパネルを設置するチャンネルを選択')
        .addChannelTypes(ChannelType.GuildText)
    );

    await interaction.update({
      content: '📊 KPIパネルを設置するテキストチャンネルを選択してください。',
      components: [row],
    });
  } catch (err) {
    logger.error('[KPI] handleSelectStore error:', err);
  }
}

// ====================================================
// チャンネル選択 → KPIパネル送信
// ====================================================
async function handleSelectChannel(interaction) {
  try {
    const channelId = interaction.values[0];
    const { guild } = interaction;

    const temp = await kpiConfigStore.getTemp(guild.id);
    if (!temp?.storeId) {
      await interaction.reply({
        content: '❌ 店舗情報が見つかりません。最初からやり直してください。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 本保存
    await kpiConfigStore.save(guild.id, {
      storeId: temp.storeId,
      panelChannelId: channelId,
    });

    // KPIパネル送信（後で実装）
    const { sendKpiPanel } = require('../panel/sendKpiPanel');
    const channel = guild.channels.cache.get(channelId);

    if (channel) {
      await sendKpiPanel({
        guild,
        channel,
        storeId: temp.storeId,
      });
    }

    // 管理パネル再表示
    await sendKpiSettingPanel(interaction);
  } catch (err) {
    logger.error('[KPI] handleSelectChannel error:', err);
  }
}

// ====================================================
// 役職選択（KPI承認役職）
// ====================================================
async function handleSelectRole(interaction) {
  try {
    const roleId = interaction.values[0];
    const { guild } = interaction;

    await kpiConfigStore.save(guild.id, {
      approveRoleId: roleId,
    });

    await sendKpiSettingPanel(interaction);
  } catch (err) {
    logger.error('[KPI] handleSelectRole error:', err);
  }
}

module.exports = {
  handleSelectStore,
  handleSelectChannel,
  handleSelectRole,
};