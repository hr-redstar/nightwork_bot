// modules/kpi/modal/modalHandlers.js
// ----------------------------------------------------
// KPI モーダル送信後の処理
//  - KPI目標登録
//  - KPI申請
//  - Embed更新
//  - 承認役職通知
// ----------------------------------------------------

const { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../../utils/logger');
const { getBotFooter } = require('../../common/utils/embed/getBotFooter');
const { getEmbedColor } = require('../../common/utils/embed/getEmbedColor');

const {
  getKpiConfig,
  saveKpiTarget,
  getKpiTarget,
  saveKpiApply,
  getKpiApply,
} = require('../store/kpiConfigStore');
const { sendApprovalPanel } = require('../../common/approval/sendApprovalPanel');
const storeMaster = require('../../common/constants/stores');

// ====================================================
// KPI目標登録
// ====================================================
async function handleTargetModal(interaction) {
  try {
    const { guild, channel } = interaction;

    const values = getModalValues(interaction);

    // 保存（期間キーは仮で current）
    await saveKpiTarget(guild.id, {
      period: 'current',
      ...values,
    });

    await interaction.reply({
      content: '✅ KPI目標を登録しました。',
      flags: MessageFlags.Ephemeral,
    });

    await updateKpiPanel({
      guild,
      channel,
      target: values,
    });
  } catch (err) {
    logger.error('[KPI] handleTargetModal error:', err);
  }
}

// ====================================================
// KPI申請
// ====================================================
async function handleApplyModal(interaction) {
  try {
    const { guild, channel, user } = interaction;

    const values = getModalValues(interaction);

    await saveKpiApply(guild.id, {
      userId: user.id,
      period: 'current',
      ...values,
    });

    await interaction.reply({
      content: '📨 KPI申請を送信しました。',
      flags: MessageFlags.Ephemeral,
    });

    await notifyApproveRole({
      guild,
      channel,
      user,
      values,
    });

    await updateKpiPanel({
      guild,
      channel,
      actual: values,
    });
  } catch (err) {
    logger.error('[KPI] handleApplyModal error:', err);
  }
}

// ====================================================
// 共通：モーダル値取得
// ====================================================
function getModalValues(interaction) {
  return {
    visitors: interaction.fields.getTextInputValue('visitors'),
    nominationCount: interaction.fields.getTextInputValue('nominationCount'),
    nominationSales: interaction.fields.getTextInputValue('nominationSales'),
    freeSales: interaction.fields.getTextInputValue('freeSales'),
    totalSales: interaction.fields.getTextInputValue('totalSales'),
  };
}

// ====================================================
// KPIパネル Embed 更新
// ====================================================
async function updateKpiPanel({ guild, channel, target, actual }) {
  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const message = messages.find(
      m => m.author.id === channel.client.user.id && m.embeds.length
    );
    if (!message) return;

    const embed = EmbedBuilder.from(message.embeds[0]);
    const desc = [];

    const config = await getKpiConfig(guild.id);
    const store = storeMaster.find(s => s.id === config.storeId);

    desc.push(`**KPIログ：** <#${config.panelChannelId}>`);
    desc.push('');
    desc.push('**KPI目標値（現在期間）**');

    const targetData = target || (await getKpiTarget(guild.id));
    if (targetData) {
      desc.push(`来客数：${targetData.visitors}`);
      desc.push(`指名本数：${targetData.nominationCount}`);
      desc.push(`指名売上：¥${targetData.nominationSales}`);
      desc.push(`フリー売上：¥${targetData.freeSales}`);
      desc.push(`総売上：¥${targetData.totalSales}`);
    } else {
      desc.push('未設定');
    }

    desc.push('');
    desc.push('**実際のKPI**');

    const actualData = actual || (await getKpiApply(guild.id));
    if (actualData) {
      desc.push(`来客数：${actualData.visitors}`);
      desc.push(`指名本数：${actualData.nominationCount}`);
      desc.push(`指名売上：¥${actualData.nominationSales}`);
      desc.push(`フリー売上：¥${actualData.freeSales}`);
      desc.push(`総売上：¥${actualData.totalSales}`);
    } else {
      desc.push('（未申請）');
    }

    desc.push('');
    desc.push(
      `**KPI申請役職：** ${config.requestRoleId ? `<@&${config.requestRoleId}>` : '未設定'
      }`
    );

    embed
      .setTitle(`📊 KPIパネル｜${store?.name ?? ''}`)
      .setDescription(desc.join('\n'))
      .setColor(getEmbedColor('kpi', config))
      .setFooter(getBotFooter(channel))
      .setTimestamp();

    await message.edit({ embeds: [embed] });
  } catch (err) {
    logger.error('[KPI] updateKpiPanel error:', err);
  }
}

// ====================================================
// 承認役職通知
// ====================================================
async function notifyApproveRole({ guild, channel, user, values }) {
  try {
    const config = await getKpiConfig(guild.id);
    if (!config?.approveRoleId) return;

    await sendApprovalPanel({
      channel,
      mentionRoleId: config.approveRoleId,
      title: '📨 KPI申請 承認待ち',
      descriptionLines: [
        `申請者：${user}`,
        '',
        '**申請内容**',
        `来客数：${values.visitors}`,
        `指名本数：${values.nominationCount}`,
        `指名売上：¥${values.nominationSales}`,
        `フリー売上：¥${values.freeSales}`,
        `総売上：¥${values.totalSales}`,
      ],
      payload: { type: 'kpi', guildId: guild.id, applicantId: user.id },
    });
  } catch (err) {
    logger.error('[KPI] notifyApproveRole error:', err);
  }
}

/**
 * KPI申請モーダル送信処理（エイリアス）
 */
async function handleSubmitKpiApply(interaction) {
  return await handleApplyModal(interaction);
}

module.exports = {
  handleTargetModal,
  handleApplyModal,
  handleSubmitKpiApply,
};