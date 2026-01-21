/**
 * syutHandler_Cast.js
 * キャスト出退勤パネルのボタン操作・登録処理
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
const { readJSON } = require('../../../utils/gcs');
const {
  getSyutConfig,
  saveSyutConfig,
  getDailySyuttaikin,
  saveDailySyuttaikin,
} = require('../../../utils/syut/syutConfigManager');
const { updateCastPanelMessage } = require('./panel');

/** 店舗_役職_ロール.json のパス */
function getRoleConfigPath(guildId) {
  return `GCS/${guildId}/config/店舗_役職_ロール.json`;
}

/**
 * キャスト出退勤パネルの全ボタン・メニューイベント処理
 */
async function handleSyutCast(interaction) {
  /* ---------------------------------------------------------------------- */
  /* 🎭 役職ロール設定 */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('cast_role_setup:')) {
    const [, storeName] = interaction.customId.split(':');
    const filePath = getRoleConfigPath(interaction.guild.id);

    const roleConfig = await readJSON(filePath);
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
      .setCustomId(`cast_role_select:${storeName}`)
      .setPlaceholder('役職を選択してください')
      .addOptions(roles.map(r => ({ label: r, value: r })));

    return interaction.reply({
      content: `店舗「${storeName}」の役職を選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // 選択完了時 → 保存
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('cast_role_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const roleName = interaction.values[0];
    const config = await getSyutConfig(interaction.guild.id);

    config.castPanelList ||= {};
    config.castPanelList[storeName] ||= {};
    config.castPanelList[storeName].role = roleName;
    await saveSyutConfig(interaction.guild.id, config);

    return interaction.update({
      content: `✅ 店舗「${storeName}」のキャスト役職を「${roleName}」に設定しました。`,
      components: [],
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 🕒 出退勤登録（役職指定のユーザーから選択） */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('cast_register:')) {
    const [, storeName] = interaction.customId.split(':');
    const config = await getSyutConfig(interaction.guild.id);
    const roleName = config.castPanelList?.[storeName]?.role;
    if (!roleName)
      return interaction.reply({ content: `⚠️ 店舗「${storeName}」の役職が未設定です。`, flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const role = guild.roles.cache.find(r => r.name === roleName.replace('@', '').trim());
    if (!role) return interaction.reply({ content: `⚠️ Discord上に「${roleName}」の役職が見つかりません。`, flags: MessageFlags.Ephemeral });

    const members = role.members.map(m => ({ label: m.displayName, value: m.id }));
    if (!members.length)
      return interaction.reply({ content: '⚠️ 指定役職に所属するメンバーがいません。', flags: MessageFlags.Ephemeral });

    const select = new UserSelectMenuBuilder()
      .setCustomId(`cast_user_select:${storeName}`)
      .setPlaceholder('出退勤登録するキャストを選択')
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      content: `店舗「${storeName}」の出勤者を選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // ユーザー選択後 → モーダル入力
  if (interaction.isUserSelectMenu() && interaction.customId.startsWith('cast_user_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const userId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`cast_entry_modal:${storeName}:${userId}`)
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

  // モーダル送信後 → 登録保存
  if (interaction.isModalSubmit() && interaction.customId.startsWith('cast_entry_modal:')) {
    const [, storeName, userId] = interaction.customId.split(':');
    const member = await interaction.guild.members.fetch(userId);
    const name = member.displayName;

    const dates = interaction.fields.getTextInputValue('date').split('\n').map(v => v.trim());
    const start = interaction.fields.getTextInputValue('start').trim();
    const end = interaction.fields.getTextInputValue('end').trim();

    for (const date of dates) {
      const daily = await getDailySyuttaikin(interaction.guild.id, storeName, date);
      daily.cast.push({ name, start, end, note: '' });
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
  if (interaction.isButton() && interaction.customId.startsWith('cast_manual_register:')) {
    const [, storeName] = interaction.customId.split(':');
    const modal = new ModalBuilder()
      .setCustomId(`cast_manual_modal:${storeName}`)
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

  // 手入力モーダル送信
  if (interaction.isModalSubmit() && interaction.customId.startsWith('cast_manual_modal:')) {
    const [, storeName] = interaction.customId.split(':');
    const names = interaction.fields.getTextInputValue('names').split('\n').map(v => v.trim()).filter(Boolean);
    const dates = interaction.fields.getTextInputValue('dates').split('\n').map(v => v.trim()).filter(Boolean);
    const start = interaction.fields.getTextInputValue('start').trim();
    const end = interaction.fields.getTextInputValue('end').trim();

    for (const date of dates) {
      const daily = await getDailySyuttaikin(interaction.guild.id, storeName, date);
      for (const name of names) {
        daily.cast.push({ name, start, end, note: '手動登録' });
      }
      await saveDailySyuttaikin(interaction.guild.id, storeName, date, daily);
    }

    return interaction.reply({
      content: `✅ 手動で ${names.length}名 × ${dates.length}日分の出退勤を登録しました。`,
      flags: MessageFlags.Ephemeral,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* 📢 本日のキャスト設置 */
  /* ---------------------------------------------------------------------- */
  if (interaction.isButton() && interaction.customId.startsWith('cast_today_setup:')) {
    const [, storeName] = interaction.customId.split(':');

    const select = new ChannelSelectMenuBuilder()
      .setCustomId(`cast_today_channel_select:${storeName}`)
      .setPlaceholder('投稿先チャンネルを選択してください')
      .addChannelTypes(ChannelType.GuildText);

    return interaction.reply({
      content: `店舗「${storeName}」の「本日のキャスト」を投稿するチャンネルを選択してください。`,
      components: [new ActionRowBuilder().addComponents(select)],
      flags: MessageFlags.Ephemeral,
    });
  }

  // チャンネル選択後 → 時刻入力
  if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('cast_today_channel_select:')) {
    const [, storeName] = interaction.customId.split(':');
    const channelId = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`cast_today_time_modal:${storeName}:${channelId}`)
      .setTitle('📅 本日のキャスト 投稿時間設定');

    const timeInput = new TextInputBuilder()
      .setCustomId('time')
      .setLabel('毎日投稿する時間（24時間形式 例: 13:00）')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(timeInput));
    return interaction.showModal(modal);
  }

  // 時刻入力モーダル送信後 → 投稿 + 保存 + パネル更新
  if (interaction.isModalSubmit() && interaction.customId.startsWith('cast_today_time_modal:')) {
    const [, storeName, channelId] = interaction.customId.split(':');
    const time = interaction.fields.getTextInputValue('time').trim();

    const config = await getSyutConfig(interaction.guild.id);
    config.castPanelList ||= {};
    config.castPanelList[storeName] ||= {};
    config.castPanelList[storeName].channel = `<#${channelId}>`;
    config.castPanelList[storeName].time = time;
    config.castPanelList[storeName].panelChannelId ||= interaction.channel.id;
    await saveSyutConfig(interaction.guild.id, config);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const daily = await getDailySyuttaikin(interaction.guild.id, storeName, dateStr);
    const sorted = [...daily.cast].sort((a, b) => a.start.localeCompare(b.start));
    const lines = sorted.length
      ? sorted.map(p => `🕒 ${p.start}　${p.name}（退勤：${p.end}）`).join('\n')
      : '登録なし';

    const embed = new EmbedBuilder()
      .setTitle(`📅 本日のキャスト ${y}年${m}月${d}日`)
      .setDescription(lines)
      .setFooter({ text: `店舗：${storeName}` })
      .setTimestamp();

    const channel = interaction.guild.channels.cache.get(channelId);
    await channel.send({ embeds: [embed] });

    await updateCastPanelMessage(interaction.guild, storeName);

    return interaction.reply({
      content: `✅ 店舗「${storeName}」の「本日のキャスト」を ${channel} に送信しました。\n以後、毎日 **${time}** に自動投稿されます。`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = { handleSyutCast };