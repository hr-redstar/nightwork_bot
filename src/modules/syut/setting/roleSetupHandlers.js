// src/modules/syut/setting/roleSetupHandlers.js
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  RoleSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { readJSON } = require('../../../utils/gcs');
const { getRoleConfig, setRoleConfig } = require('../../../utils/syut/syutConfigManager');

/**
 * 店舗_役職_ロール.json のパス
 */
function getStoreRoleConfigPath(guildId) {
  return `GCS/${guildId}/config/店舗_役職_ロール.json`;
}

/**
 * 共通：店舗の役職リストを取得する
 */
async function getStorePositions(guildId, storeName) {
  const filePath = getStoreRoleConfigPath(guildId);
  const config = await readJSON(filePath);
  
  if (!config || !config[storeName]) {
    return [];
  }

  // config[storeName] は { "役職名": "ロールID(または空)", ... } の形式と想定
  // キー（役職名）のリストを返す
  return Object.keys(config[storeName]);
}

/* -------------------------------------------------------------------------- */
/* 🎭 キャスト役職設定 */
/* -------------------------------------------------------------------------- */

/**
 * 1. 役職選択メニュー表示
 */
async function handleCastRoleSetup(interaction) {
  await handleRoleSetup(interaction, 'cast');
}

/**
 * 2. Discordロール選択メニュー表示
 */
async function handleCastRoleSelect(interaction) {
  await handleRoleSelect(interaction, 'cast');
}

/**
 * 3. 保存処理
 */
async function handleCastDiscordRoleSelect(interaction) {
  await saveRoleSelection(interaction, 'cast');
}

/* -------------------------------------------------------------------------- */
/* 🕴️ 黒服（Staff）役職設定 */
/* -------------------------------------------------------------------------- */

/**
 * 1. 役職選択メニュー表示 (kurofuku_role_setup:店舗名)
 */
async function handleKurofukuRoleSetup(interaction) {
  await handleRoleSetup(interaction, 'staff');
}

/**
 * 2. Discordロール選択メニュー表示 (syut:staff:sel:role_select:店舗名)
 */
async function handleKurofukuRoleSelect(interaction) {
  await handleRoleSelect(interaction, 'staff');
}

/**
 * 3. 保存処理 (syut:staff:sel:discord_role:店舗名:役職名)
 */
async function handleKurofukuDiscordRoleSelect(interaction) {
  await saveRoleSelection(interaction, 'staff');
}

/* -------------------------------------------------------------------------- */
/* ⚙️ 共通ハンドラー */
/* -------------------------------------------------------------------------- */

/**
 * 共通: 1. 役職選択メニュー表示
 * @param {import('discord.js').Interaction} interaction
 * @param {'cast'|'staff'} type
 */
async function handleRoleSetup(interaction, type) {
  const icon = type === 'cast' ? '🎭' : '🕴️';
  const customId = `syut:${type}:sel:role_select:`;
  const logPrefix = `[${type === 'cast' ? 'Cast' : 'Kurofuku'}RoleSetup]`;

  try {
    const storeName = interaction.customId.split(':')[1];
    const guildId = interaction.guild.id;
    const positions = await getStorePositions(guildId, storeName);

    if (positions.length === 0) {
      const message = type === 'cast'
        ? `⚠️ 店舗「${storeName}」の役職設定が見つかりません。\n\`config/店舗_役職_ロール.json\` を確認してください。`
        : `⚠️ 店舗「${storeName}」の役職設定が見つかりません。`;
      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`${customId}${storeName}`)
      .setPlaceholder('設定する「役職」を選択してください')
      .addOptions(positions.map(pos => ({ label: pos, value: pos })).slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: `${icon} **${storeName}** の設定を行う役職を選択してください。`,
      components: [row],
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error(`${logPrefix} Error:`, error);
    await interaction.reply({ content: '❌ エラーが発生しました。', flags: MessageFlags.Ephemeral });
  }
}

/**
 * 共通: 2. Discordロール選択メニュー表示
 * @param {import('discord.js').Interaction} interaction
 * @param {'cast'|'staff'} type
 */
async function handleRoleSelect(interaction, type) {
  const logPrefix = `[${type === 'cast' ? 'Cast' : 'Kurofuku'}RoleSelect]`;
  const customId = `syut:${type}:sel:discord_role:`;

  try {
    const storeName = interaction.customId.split(':')[4];
    const selectedPosition = interaction.values[0];

    // ※役職名に区切り文字が含まれると危険ですが、簡易実装として進めます
    const selectMenu = new RoleSelectMenuBuilder()
      .setCustomId(`${customId}${storeName}:${selectedPosition}`)
      .setPlaceholder(`「${selectedPosition}」に紐づけるDiscordロールを選択`)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.update({
      content: `✅ 役職 **「${selectedPosition}」** を選択しました。\n次に、この役職に紐づける **Discordロール** を選択してください。`,
      components: [row]
    });

  } catch (error) {
    console.error(`${logPrefix} Error:`, error);
    await interaction.reply({ content: '❌ エラーが発生しました。', flags: MessageFlags.Ephemeral });
  }
}

/**
 * 共通：3. 選択されたDiscordロールを保存する
 * @param {import('discord.js').Interaction} interaction
 * @param {'cast'|'staff'} type
 */
async function saveRoleSelection(interaction, type) {
  try {
    const parts = interaction.customId.split(':');
    const storeName = parts[4];
    const positionName = parts.slice(5).join(':'); // 役職名にコロンが含まれていた場合の復元
    const roleId = interaction.values[0];
    const guildId = interaction.guild.id;
    
    const currentConfig = await getRoleConfig(guildId, type, storeName);
    currentConfig[positionName] = roleId;
    await setRoleConfig(guildId, type, storeName, currentConfig);
    
    const typeText = type === 'cast' ? '役職' : '黒服役職';
    await interaction.update({
      content: `✅ **${storeName}** の${typeText} **「${positionName}」** にロール <@&${roleId}> を紐付けました。`,
      components: []
    });
  } catch (error) {
    console.error(`[${type}DiscordRoleSelect] Error:`, error);
    await interaction.reply({ content: '❌ 保存中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
  }
}

module.exports = {
  handleCastRoleSetup,
  handleCastRoleSelect,
  handleCastDiscordRoleSelect,
  handleKurofukuRoleSetup,
  handleKurofukuRoleSelect,
  handleKurofukuDiscordRoleSelect
};