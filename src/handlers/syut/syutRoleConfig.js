// src/handlers/syut/syutRoleConfig.js
const { StringSelectMenuBuilder, RoleSelectMenuBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuOptionBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getRoleList } = require('../../utils/config/configAccessor');
const { sendSettingLog } = require('../config/configLogger');

async function showRoleLink(interaction, kind, storeName) {
  const roles = interaction.guild.roles.cache.filter(r => !r.managed && r.name !== '@everyone')
    .map(r => ({ label: r.name, value: r.id }));
  const positions = await getRoleList(interaction.guild.id);

  const positionSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_pos_select_${kind}_${storeName}`)
    .setPlaceholder('役職を選択')
    .addOptions(positions.slice(0, 25).map(p => ({ label: p, value: p })));

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('syut_role_select_placeholder') // ダミーID
    .setPlaceholder('先に上の役職を選択してください')
    .setDisabled(true)
    .addOptions([{ label: 'dummy', value: 'dummy' }]);

  await interaction.reply({
    content: `🧩 ${kind === 'cast' ? 'キャスト' : '黒服'} 役職/ロール設定（店舗：${storeName}）`,
    components: [new ActionRowBuilder().addComponents(positionSelect), new ActionRowBuilder().addComponents(roleSelect)],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 役職選択後、ロール選択メニューを表示
 * @param {import('discord.js').Interaction} interaction
 * @param {'cast' | 'black'} kind
 * @param {string} store
 * @param {string} position
 */
async function showRoleSelectForPosition(interaction, kind, store, position) {
  // 既存の役職選択メニューを更新して、選択された役職がわかるようにする
  const posMenuRaw = interaction.message.components[0].components[0];
  const newPosMenu = new StringSelectMenuBuilder()
    .setCustomId(posMenuRaw.customId)
    .setPlaceholder(posMenuRaw.placeholder)
    .addOptions(
      posMenuRaw.options.map(opt =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.label)
          .setValue(opt.value)
          .setDefault(opt.value === position)
      )
    );

  // ロール選択メニューを作成
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(`syut_role_select_${kind}_${store}`)
    .setPlaceholder('紐づけるDiscordロールを選択')
    .setMinValues(1);

  await interaction.update({
    content: `✅ 役職「**${position}**」を選択しました。\n次に、この役職に紐づけるDiscordロールを選択してください。`,
    components: [
      new ActionRowBuilder().addComponents(newPosMenu),
      new ActionRowBuilder().addComponents(roleSelect),
    ],
  });
}

async function saveRoleLink(interaction, kind, storeName, positionName, roleIds) {
  const key = kind === 'cast' ? 'syutCastRoleLinks' : 'syutBlackRoleLinks';
  const cfg = (await getGuildConfig(interaction.guild.id)) || {};
  if (!cfg[key]) cfg[key] = {};
  if (!cfg[key][storeName]) cfg[key][storeName] = {};
  cfg[key][storeName][positionName] = roleIds;
  await setGuildConfig(interaction.guild.id, cfg);

  await sendSettingLog(interaction.guild, {
    user: interaction.user,
    message: `🧩 ${kind === 'cast' ? 'キャスト' : '黒服'} 役職/ロール更新（店舗：**${storeName}**／役職：**${positionName}**／ロール：${roleIds.map(r=>`<@&${r}>`).join(', ')})`,
    type: '出退勤設定',
  });

  await interaction.update({ content: '✅ 役職/ロールを保存しました。', components: [] });
}

module.exports = { showRoleLink, saveRoleLink };
