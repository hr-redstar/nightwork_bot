// src/handlers/syut/syutAttendanceHandler.js
const { getTodayAttendance, saveAttendanceData } = require('../../utils/syut/gcsSyut');

function parseDates(text) {
  return text.split('\n').map(s => s.trim()).filter(Boolean);
}

async function saveAttendance(guildId, store, userKey, displayName, date, inTime, outTime) {
  const [yyyy, mm, dd] = date.split('-');
  const dateKey = `${yyyy}-${mm}-${dd}`;
  const data = await getTodayAttendance(guildId, store, new Date(date));

  if (!data[userKey]) data[userKey] = { name: displayName, in: null, out: null };
  data[userKey].in = inTime;
  data[userKey].out = outTime;
  await saveAttendanceData(guildId, store, dateKey, data);
}
// ... (rest of the file)
async function handleModal(interaction) {
  const [ , , kindType, kind, store ] = interaction.customId.split('_'); // syut_modal_(manual|select)_(cast|black)_STORE
  const isManual = kindType === 'manual';
  const dates = parseDates(interaction.fields.getTextInputValue('dates'));
  const inTime = interaction.fields.getTextInputValue('in');
  const outTime = interaction.fields.getTextInputValue('out');

  if (isManual) {
    const names = interaction.fields.getTextInputValue('names').split('\n').map(s=>s.trim()).filter(Boolean);
    for (const name of names) {
      for (const d of dates) {
        await saveAttendance(interaction.guild.id, store, `name:${name}`, name, d, inTime, outTime);
      }
    }
  } else {
    // 既存ユーザー選択パス（呼び出し時に対象者IDをcustomIdに含める場合はこちらで処理）
    // ex: syut_modal_select_cast_${store}_${userId}
    const parts = interaction.customId.split('_');
    const targetUserId = parts[5] || interaction.user.id;
    const member = await interaction.guild.members.fetch(targetUserId).catch(()=>null);
    const label = member ? member.displayName : `user:${targetUserId}`;
    for (const d of dates) {
      await saveAttendance(interaction.guild.id, store, targetUserId, label, d, inTime, outTime);
    }
  }

}

module.exports = { handleModal };
