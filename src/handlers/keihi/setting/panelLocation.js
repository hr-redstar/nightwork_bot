// src/handlers/keihi/setting/panelLocation.js
// ----------------------------------------------------
// 「経費パネル設置」ボタンまわり
//   - 店舗選択
//   - チャンネル選択
//   - keihi/config.json への保存
//   - 店舗別経費申請パネルの設置/更新
// ----------------------------------------------------

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MessageFlags,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');

const logger = require('../../../utils/logger');
const {
  loadKeihiConfig,
  saveKeihiConfig,
  loadKeihiStoreConfig,
  saveKeihiStoreConfig,
} = require('../../../utils/keihi/keihiConfigManager');
const {
  loadStoreRoleConfig,
} = require('../../../utils/config/storeRoleConfigManager');
const { sendSettingLog } = require('../../../utils/config/configLogger');

const {
  upsertStorePanelMessage,
} = require('../request/panel');
const { resolveStoreName } = require('./panel');
const { IDS, PANEL_CHANNEL_PREFIX } = require('./ids');

/**
 * 「経費パネル設置」ボタン → 店舗選択
 */
async function handleSetPanelButton(interaction) {
  try {
    const guildId = interaction.guild.id;
    let storeRoleConfig;

    try {
      storeRoleConfig = await loadStoreRoleConfig(guildId);
    } catch (err) {
      logger.error(
        '[keihi/setting/panelLocation] 店舗ロール設定読み込み失敗',
        err,
      );
    }

    // /設定 で作られた 店舗_役職_ロール.json を店舗リストの正とする
    const rawStores = storeRoleConfig?.stores ?? storeRoleConfig ?? {};

    /** @type {{ id: string, name: string }[]} */
    let stores = [];

    if (Array.isArray(rawStores)) {
      // 配列: ['店舗A', '店舗B'] or [{ id, name, storeName, ... }]
      stores = rawStores.map((store, index) => {
        if (typeof store === 'string') {
          return { id: String(index), name: store };
        }
        const id = store.id ?? store.storeId ?? index;
        const name =
          store.name ??
          store.storeName ??
          `店舗${id}`;
        return {
          id: String(id),
          name: String(name),
        };
      });
    } else if (rawStores && typeof rawStores === 'object') {
      // オブジェクト: { "<storeId>": { name, storeName, ... } }
      stores = Object.keys(rawStores).map((storeId) => {
        const name = resolveStoreName(storeRoleConfig, storeId);
        return {
          id: String(storeId),
          name: String(name),
        };
      });
    }

    if (!stores.length) {
      await interaction.reply({
        content:
          '店舗が登録されていません。先に`/設定`コマンドなどで店舗を作成してください。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const options = stores.map((store) => ({
      label: store.name, // 表示名：店舗名
      value: store.name, // value：店舗名（= GCS の店舗ディレクトリ名として使う）
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId(IDS.SEL_STORE_FOR_PANEL)
      .setPlaceholder('経費パネルを設置する店舗を選択')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: '経費パネルを設置する店舗を選択してください。',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    logger.error(
      '[keihi/setting/panelLocation] handleSetPanelButton エラー',
      err,
    );
    try {
      await interaction.reply({
        content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyErr) {
      logger.error(
        '[keihi/setting/panelLocation] エラーメッセージ送信失敗',
        replyErr,
      );
    }
  }
}

/**
 * 店舗選択 → パネル設置チャンネル選択
 */
async function handleStoreForPanelSelect(interaction) {
  try {
    const storeName = interaction.values[0]; // value に店舗名を入れている

    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(`${PANEL_CHANNEL_PREFIX}${storeName}`) // keihi_config:sel:panel_channel:店舗名
      .setPlaceholder('経費申請パネルを設置するテキストチャンネルを選択')
      .setChannelTypes(ChannelType.GuildText);

    const row = new ActionRowBuilder().addComponents(chSelect);

    await interaction.update({
      content: `店舗「${storeName}」の経費申請パネルを設置するチャンネルを選択してください。`,
      components: [row],
    });
  } catch (err) {
    logger.error(
      '[keihi/setting/panelLocation] handleStoreForPanelSelect エラー',
      err,
    );
    try {
      if (!interaction.replied) {
        await interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.editReply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          components: [],
        });
      }
    } catch (replyErr) {
      logger.error(
        '[keihi/setting/panelLocation] エラーメッセージ送信失敗',
        replyErr,
      );
    }
  }
}

/**
 * チャンネル選択 → keihi/config.json に保存 & 経費申請パネルを設置
 *
 * @param {import('discord.js').ChannelSelectMenuInteraction} interaction
 * @param {(guild: import('discord.js').Guild, keihiConfig: any) => Promise<void>} refreshPanel
 */
async function handlePanelChannelSelect(interaction, refreshPanel) {
  try {
    const guild = interaction.guild;
    const guildId = guild.id;

    const id = interaction.customId; // keihi_config:sel:panel_channel:{店舗名}
    const parts = id.split(':');
    const storeId = parts[parts.length - 1]; // 店舗ID=店舗名として扱う

    logger.info(
      `[keihi/setting/panelLocation] handlePanelChannelSelect: storeId="${storeId}", guildId="${guildId}"`,
    );

    const channelId = interaction.values[0];
    const channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      logger.warn(
        `[keihi/setting/panelLocation] チャンネルが無効: channelId="${channelId}"`,
      );
      await interaction.reply({
        content: '選択されたチャンネルにメッセージを送信できません。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // 3秒制限対策：以降の処理は長くなるので、まず deferUpdate で回答待機中を示す
    // ただし、最後は editReply で更新する（update は使わない）
    logger.info('[keihi/setting/panelLocation] deferUpdate開始');
    await interaction.deferUpdate();
    logger.info('[keihi/setting/panelLocation] deferUpdate完了');

    const keihiConfig = await loadKeihiConfig(guildId);

    if (!keihiConfig.panels) {
      keihiConfig.panels = {};
    }

    if (!keihiConfig.panels[storeId]) {
      keihiConfig.panels[storeId] = {
        channelId,           // ここに設置先チャンネル
        messageId: null,
        requestRoleIds: [],
        items: [],
      };
    } else {
      keihiConfig.panels[storeId].channelId = channelId;
    }

    logger.info('[keihi/setting/panelLocation] keihiConfig保存開始');
    await saveKeihiConfig(guildId, keihiConfig);
    logger.info('[keihi/setting/panelLocation] keihiConfig保存完了');

    // 店舗ロール設定読み込み（パネル文言用）
    const storeRoleConfig = await loadStoreRoleConfig(guildId).catch(() => null);

    // 店舗ごとの経費申請パネルメッセージを upsert
    logger.info('[keihi/setting/panelLocation] upsertStorePanelMessage開始');
    const panelMessage = await upsertStorePanelMessage(
      guild,
      storeId,
      keihiConfig,
      storeRoleConfig,
    );
    logger.info(`[keihi/setting/panelLocation] upsertStorePanelMessage完了: messageId=${panelMessage?.id}`);

    // panelMessage.id を keihiConfig.panels に反映
    if (panelMessage?.id) {
      keihiConfig.panels[storeId].messageId = panelMessage.id; // この時点で keihiConfig は更新されている
      await saveKeihiConfig(guildId, keihiConfig);
    }

    // 店舗別 config (GCS/ギルドID/keihi/店舗名/config.json) にも保存
    const storeConfig = (await loadKeihiStoreConfig(guildId, storeId)) || {};
    storeConfig.storeId = storeId;
    storeConfig.panel = {
      channelId,
      messageId: panelMessage?.id || storeConfig.panel?.messageId || null,
    };
    await saveKeihiStoreConfig(guildId, storeId, storeConfig);

    // 💸 経費設定パネルを再描画
    // keihiConfig は panelMessage.id の保存で更新されているので、そのまま渡す
    logger.info('[keihi/setting/panelLocation] refreshPanel開始');
    try {
      await refreshPanel(guild, keihiConfig);
      logger.info('[keihi/setting/panelLocation] refreshPanel完了');
    } catch (refreshErr) {
      logger.warn('[keihi/setting/panelLocation] refreshPanel失敗（続行）', refreshErr);
    }

    const storeName = resolveStoreName(storeRoleConfig, storeId);

    logger.info('[keihi/setting/panelLocation] sendSettingLog開始');
    try {
      await sendSettingLog(interaction, {
        title: '経費申請パネル設置',
        description: `店舗「${storeName}」の経費申請パネルを <#${channelId}> に設置しました。`,
      });
      logger.info('[keihi/setting/panelLocation] sendSettingLog完了');
    } catch (logErr) {
      logger.warn('[keihi/setting/panelLocation] sendSettingLog失敗（続行）', logErr);
    }

    // このメッセージ自体は、最初の reply が Ephemeral なのでそのまま本人限定
    logger.info('[keihi/setting/panelLocation] interaction.editReply開始');
    await interaction.editReply({
      content: `店舗「${storeName}」の経費申請パネルを <#${channelId}> に設置しました。`,
      components: [],
    });
    logger.info('[keihi/setting/panelLocation] interaction.editReply完了');
  } catch (err) {
    logger.error(
      '[keihi/setting/panelLocation] handlePanelChannelSelect エラー',
      err,
    );
    logger.error(
      '[keihi/setting/panelLocation] エラー詳細:',
      {
        message: err.message,
        code: err.code,
        status: err.status,
        stack: err.stack,
      },
    );
    try {
      // interaction がまだ reply されていなければ reply、既に deferUpdate されていれば editReply
      if (!interaction.replied && !interaction.deferred) {
        logger.info('[keihi/setting/panelLocation] reply でエラーメッセージを送信');
        await interaction.reply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        logger.info('[keihi/setting/panelLocation] editReply でエラーメッセージを送信');
        await interaction.editReply({
          content: `エラーが発生しました: ${err.message || 'Unknown error'}`,
          components: [],
        });
      }
    } catch (replyErr) {
      logger.error(
        '[keihi/setting/panelLocation] エラーメッセージ送信失敗',
        replyErr,
      );
    }
  }
}

module.exports = {
  handleSetPanelButton,
  handleStoreForPanelSelect,
  handlePanelChannelSelect,
};
