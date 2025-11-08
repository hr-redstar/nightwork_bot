// src/handlers/syut/syutRoleConfig.js
const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { getGuildConfig, setGuildConfig } = require('../../utils/config/gcsConfigManager');
const { getRoleList } = require('../../utils/config/configAccessor');
const { sendSettingLog } = require('../config/configLogger');

async function showRoleLink(interaction, kind, storeName) {
  const roles = interaction.guild.roles.cache.filter(r => !r.managed && r.name !== '@everyone')
    .map(r => ({ label: r.name, value: r.id }));
  const positions = await getRoleList(interaction.guild.id); // 役職名リスト

  const positionSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_pos_select_${kind}_${storeName}`)
    .setPlaceholder('役職を選択')
    .addOptions(positions.slice(0, 25).map(p => ({ label: p, value: p })));

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId(`syut_role_select_${kind}_${storeName}`)
    .setPlaceholder('ロールを選択（複数可）')
    .setMinValues(1).setMaxValues(Math.min(roles.length, 10))
    .addOptions(roles);

  await interaction.reply({
    content: `🧩 ${kind === 'cast' ? 'キャスト' : '黒服'} 役職/ロール設定（店舗：${storeName}）`,
    components: [new ActionRowBuilder().addComponents(positionSelect), new ActionRowBuilder().addComponents(roleSelect)],
    ephemeral: true,
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
