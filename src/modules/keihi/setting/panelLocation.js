const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} = require('discord.js');

const BaseInteractionHandler = require('../../../structures/BaseInteractionHandler');
const InteractionDTO = require('../../../utils/dto/InteractionDTO');
const logger = require('../../../utils/logger');
const {
  loadKeihiConfig,
  saveKeihiConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiStoreConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');
const { upsertStorePanelMessage } = require('../request/panel');
const { resolveStoreName } = require('./panel');
const { IDS } = require('./ids');

/**
 * 「経費パネル設置」ボタン → 店舗選択
 */
class SetPanelHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;

    try {
      const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);
      const rawStores = storeRoleConfig?.stores ?? [];
      let stores = [];

      if (Array.isArray(rawStores)) {
        stores = rawStores.map((store, index) => {
          if (typeof store === 'string') return { name: store };
          return { name: String(store?.name ?? `店舗${index + 1}`) };
        });
      }

      if (!stores.length) {
        return await this.safeReply(interaction, {
          content: '店舗が登録されていません。先に`/設定`などで店舗を作成してください。',
          flags: MessageFlags.Ephemeral
        });
      }

      const options = stores.map((store) => ({
        label: store.name,
        value: store.name,
      })).slice(0, 25);

      const select = new StringSelectMenuBuilder()
        .setCustomId(IDS.SEL_STORE_FOR_PANEL)
        .setPlaceholder('経費パネルを設置する店舗を選択')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      await this.safeReply(interaction, {
        content: '経費パネルを設置する店舗を選択してください。',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      logger.error('[keihi/setting/panelLocation] SetPanelHandler エラー', err);
      await this.safeReply(interaction, { content: 'エラーが発生しました。', flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * 店舗選択 → チャンネル選択
 */
class StoreForPanelSelectHandler extends BaseInteractionHandler {
  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const storeName = interaction.values?.[0];

    if (!storeName) return;

    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`${IDS.PANEL_CHANNEL_PREFIX}${storeName}`)
      .setPlaceholder('経費申請パネルを設置するテキストチャンネルを選択')
      .setChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(chSelect);

    await interaction.update({
      content: `店舗「${storeName}」の経費申請パネルを設置するチャンネルを選択してください。`,
      components: [row],
    });
  }
}

/**
 * チャンネル選択 → 保存 & パネル設置
 */
class PanelChannelSelectHandler extends BaseInteractionHandler {
  constructor(refreshPanel) {
    super();
    this.refreshPanel = refreshPanel;
  }

  async handle(interaction) {
    const dto = new InteractionDTO(interaction);
    const { guildId } = dto;
    const guild = interaction.guild;
    const storeName = interaction.customId.slice(IDS.PANEL_CHANNEL_PREFIX.length);
    const channelId = interaction.values?.[0];
    const channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      return await interaction.update({ content: '⚠️ 選択されたチャンネルは無効です。', components: [] });
    }

    const keihiConfig = await loadKeihiConfig(guildId);
    if (!keihiConfig.panels) keihiConfig.panels = {};

    if (!keihiConfig.panels[storeName]) {
      keihiConfig.panels[storeName] = { channelId, messageId: null, requestRoleIds: [], items: [] };
    } else {
      keihiConfig.panels[storeName].channelId = channelId;
    }

    await saveKeihiConfig(guildId, keihiConfig);
    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    const panelMessage = await upsertStorePanelMessage(guild, storeName, keihiConfig, storeRoleConfig);
    if (panelMessage?.id) {
      keihiConfig.panels[storeName].messageId = panelMessage.id;
      await saveKeihiConfig(guildId, keihiConfig);
    }

    const storeConfig = (await loadKeihiStoreConfig(guildId, storeName)) || {};
    storeConfig.storeName = storeName;
    storeConfig.panel = { channelId, messageId: panelMessage?.id || null };
    await saveKeihiStoreConfig(guildId, storeName, storeConfig);

    if (this.refreshPanel) {
      await this.refreshPanel(guild, keihiConfig).catch(() => { });
    }

    const displayStoreName = resolveStoreName(storeRoleConfig, storeName) || storeName;
    await sendSettingLog(interaction, {
      title: '経費申請パネル設置',
      description: `店舗「${displayStoreName}」の経費申請パネルを <#${channelId}> に設置しました。`,
    });

    await interaction.update({
      content: `✅ 店舗「${displayStoreName}」のパネルを <#${channelId}> に設置完了しました。`,
      components: [],
    });
  }
}

module.exports = {
  handleSetPanelButton: new SetPanelHandler(),
  handleStoreForPanelSelect: new StoreForPanelSelectHandler(),
  handlePanelChannelSelect: (refresh) => new PanelChannelSelectHandler(refresh),
};
