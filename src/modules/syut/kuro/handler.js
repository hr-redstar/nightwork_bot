/**
 * syutHandler_Kuro.js
 * 黒服出退勤パネルのボタン操作・登録処理
 */

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { readJson } = require('../../../utils/gcs');
const {
  getSyutConfig,
  saveSyutConfig,
  getDailySyuttaikin,
  saveDailySyuttaikin,
} = require('../../../utils/syut/syutConfigManager');
const { updateKuroPanelMessage } = require('./panel');

/** 店舗_役職_ロール.json のパス */
function getRoleConfigPath(guildId) {
  return `GCS/${guildId}/config/店舗_役職_ロール.json`;
}

/**
 * 黒服出退勤パネルの全操作イベントを処理
 */
async function handleSyutKuro(interaction) {
  /* ---------------------------------------------------------------------- */
  /* 🧩 役職ロール設定 */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('kuro_role_setup:')) {
    const [, storeName] = interaction.customId.split(':');
    const filePath = getRoleConfigPath(interaction.guild.id);

    const roleConfig = await readJson(filePath);
    if (!roleConfig) {
      return interaction.reply({
        content: '⚠️ 役職設定ファイルが存在しません。\n`GCS/ギルドID/config/店舗_役職_ロール.json` を確認してください。',
        flags: MessageFlags.Ephemeral,
      });
    }

    const roles = Object.keys(roleConfig[storeName] || {});
    if (!roles.length)
      return interaction.reply({ content: `⚠️ 店舗「${storeName}」に役職データがありません。`, flags: MessageFlags.Ephemeral });

    const select = new StringSelectMenuBuilder()
      .setCustomId(`kuro_role_select:${storeName}`)
      .setPlaceholder('役職を選択してください')
      .addOptions(roles.map(r => ({ label: r, value: r })));

    return interaction.reply({
      content: `店舗「${storeName}」の黒服役職を選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 選択完了 → 保存
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('kuro_role_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const roleName = interaction.values[0];
    const config = await getSyutConfig(interaction.guild.id);

    config.kurofukuPanelList ||= {};
    config.kurofukuPanelList[storeName] ||= {};
    config.kurofukuPanelList[storeName].role = roleName;
    await saveSyutConfig(interaction.guild.id, config);

    return interaction.update({
      content: `✅ 店舗「${storeName}」の黒服役職を「${roleName}」に設定しました。`,
      components: [],
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 🕒 出退勤登録（役職指定ユーザー） */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('kuro_register:')) {
    const [, storeName] = interaction.customId.split(':');
    const config = await getSyutConfig(interaction.guild.id);
    const roleName = config.kurofukuPanelList?.[storeName]?.role;
    if (!roleName)
      return interaction.reply({ content: `⚠️ 店舗「${storeName}」の役職が未設定です。`, flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const role = guild.roles.cache.find(r => r.name === roleName.replace('@', '').trim());
    if (!role) return interaction.reply({ content: `⚠️ Discord上に「${roleName}」の役職が見つかりません。`, flags: MessageFlags.Ephemeral });

    const members = role.members.map(m => ({ label: m.displayName, value: m.id }));
    if (!members.length)
      return interaction.reply({ content: '⚠️ 指定役職に所属するメンバーがいません。', flags: MessageFlags.Ephemeral });

    const select = new UserSelectMenuBuilder()
      .setCustomId(`kuro_user_select:${storeName}`)
      .setPlaceholder('出退勤登録する黒服を選択')
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: `店舗「${storeName}」の出勤者を選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // ユーザー選択 → モーダル
  if (interaction.isUserSelectMenu() && interaction.customId.startsWith('kuro_user_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const userId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`kuro_entry_modal:${storeName}:${userId}`)
      .setTitle('出退勤登録');

    const dateInput = new TextInputBuilder()
      .setCustomId('date')
      .setLabel('日付 (YYYY-MM-DD, 改行区切りで複数可)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const startInput = new TextInputBuilder()
      .setCustomId('start')
      .setLabel('出勤時間 (例: 18:00)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const endInput = new TextInputBuilder()
      .setCustomId('end')
      .setLabel('退勤時間 (例: 21:00)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(startInput),
      new ActionRowBuilder().addComponents(endInput)
    );

    return interaction.showModal(modal);
  }

  // モーダル送信 → 保存
  if (interaction.isModalSubmit() && interaction.customId.startsWith('kuro_entry_modal:')) {
    const [, storeName, userId] = interaction.customId.split(':');
    const member = await interaction.guild.members.fetch(userId);
    const name = member.displayName;

    const dates = interaction.fields.getTextInputValue('date').split('\n').map(v => v.trim());
    const start = interaction.fields.getTextInputValue('start').trim();
    const end = interaction.fields.getTextInputValue('end').trim();

    for (const date of dates) {
      const daily = await getDailySyuttaikin(interaction.guild.id, storeName, date);
      daily.kurofuku.push({ name, start, end, note: '' });
      await saveDailySyuttaikin(interaction.guild.id, storeName, date, daily);
    }

    return interaction.reply({
      content: `✅ ${name} の出退勤を登録しました（${dates.length}日分）。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* ✏️ 手動出退勤登録 */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('kuro_manual_register:')) {
    const [, storeName] = interaction.customId.split(':');
    const modal = new ModalBuilder()
      .setCustomId(`kuro_manual_modal:${storeName}`)
      .setTitle('手動出退勤登録');

    const nameInput = new TextInputBuilder()
      .setCustomId('names')
      .setLabel('名前（改行で複数入力可）')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const dateInput = new TextInputBuilder()
      .setCustomId('dates')
      .setLabel('日付 (YYYY-MM-DD, 改行区切りで複数可)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const startInput = new TextInputBuilder()
      .setCustomId('start')
      .setLabel('出勤時間 (例: 18:00)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const endInput = new TextInputBuilder()
      .setCustomId('end')
      .setLabel('退勤時間 (例: 21:00)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(dateInput),
      new ActionRowBuilder().addComponents(startInput),
      new ActionRowBuilder().addComponents(endInput)
    );

    return interaction.showModal(modal);
  }

  // 手動登録送信
  if (interaction.isModalSubmit() && interaction.customId.startsWith('kuro_manual_modal:')) {
    const [, storeName] = interaction.customId.split(':');
    const names = interaction.fields.getTextInputValue('names').split('\n').map(v => v.trim()).filter(Boolean);
    const dates = interaction.fields.getTextInputValue('dates').split('\n').map(v => v.trim()).filter(Boolean);
    const start = interaction.fields.getTextInputValue('start').trim();
    const end = interaction.fields.getTextInputValue('end').trim();

    for (const date of dates) {
      const daily = await getDailySyuttaikin(interaction.guild.id, storeName, date);
      for (const name of names) {
        daily.kurofuku.push({ name, start, end, note: '手動登録' });
      }
      await saveDailySyuttaikin(interaction.guild.id, storeName, date, daily);
    }

    return interaction.reply({
      content: `✅ 手動で ${names.length}名 × ${dates.length}日分の出退勤を登録しました。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 📢 本日の黒服設置（キャストと同様） */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('kuro_today_setup:')) {
    const [, storeName] = interaction.customId.split(':');

    const select = new ChannelSelectMenuBuilder()
      .setCustomId(`kuro_today_channel_select:${storeName}`)
      .setPlaceholder('投稿先チャンネルを選択してください')
      .addChannelTypes(ChannelType.GuildText);

    return interaction.reply({
      content: `店舗「${storeName}」の「本日の黒服」を投稿するチャンネルを選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('kuro_today_channel_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const channelId = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`kuro_today_time_modal:${storeName}:${channelId}`)
      .setTitle('📅 本日の黒服 投稿時間設定');

    const timeInput = new TextInputBuilder()
      .setCustomId('time')
      .setLabel('毎日投稿する時間（24時間形式 例: 13:00）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(timeInput));
    return interaction.showModal(modal);
  }

  // 投稿時間モーダル送信 → 投稿＋保存＋パネル更新
  if (interaction.isModalSubmit() && interaction.customId.startsWith('kuro_today_time_modal:')) {
    const [, storeName, channelId] = interaction.customId.split(':');
    const time = interaction.fields.getTextInputValue('time').trim();

    const config = await getSyutConfig(interaction.guild.id);
    config.kurofukuPanelList ||= {};
    config.kurofukuPanelList[storeName] ||= {};
    config.kurofukuPanelList[storeName].channel = `<#${channelId}>`;
    config.kurofukuPanelList[storeName].time = time;
    config.kurofukuPanelList[storeName].panelChannelId ||= interaction.channel.id;
    await saveSyutConfig(interaction.guild.id, config);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const daily = await getDailySyuttaikin(interaction.guild.id, storeName, dateStr);
    const sorted = [...daily.kurofuku].sort((a, b) => a.start.localeCompare(b.start));
    const lines = sorted.length
      ? sorted.map(p => `🕒 ${p.start}　${p.name}（退勤：${p.end}）`).join('\n')
      : '登録なし';

    const embed = new EmbedBuilder()
      .setTitle(`📅 本日の黒服 ${y}年${m}月${d}日`)
      .setDescription(lines)
      .setFooter({ text: `店舗：${storeName}` })
      .setTimestamp();

    const channel = interaction.guild.channels.cache.get(channelId);
    await channel.send({ embeds: [embed] });

    await updateKuroPanelMessage(interaction.guild, storeName);

    return interaction.reply({
      content: `✅ 店舗「${storeName}」の「本日の黒服」を ${channel} に送信しました。\n以後、毎日 **${time}** に自動投稿されます。`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = { handleSyutKuro };