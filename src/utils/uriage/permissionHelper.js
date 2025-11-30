// src/utils/uriage/permissionHelper.js
// ----------------------------------------------------
// 売上報告の承認権限チェック
//   - GCS/ギルドID/uriage/setting/config.json の approverRoles
//   - GCS/ギルドID/config/店舗_役職_ロール.json の positionRoles
// ----------------------------------------------------

const logger = require('../logger');
const { loadStoreRoleConfig } = require('../config/storeRoleConfigManager');
const { loadUriageSetting } = require('./gcsUriageSettingManager');

/**
 * メンバーが承認ロールを持っているか判定
 * @param {import('discord.js').GuildMember} member
 */
async function isApproverMember(member) {
  const guildId = member.guild.id;

  const [storeConfig, uriageSetting] = await Promise.all([
    loadStoreRoleConfig(guildId).catch(() => null),
    loadUriageSetting(guildId).catch(() => null),
  ]);

  if (!storeConfig || !uriageSetting) return false;

  const approverRoles = uriageSetting.approverRoles || []; // 例: ["店長", "黒服"]
  const positionRoles = storeConfig.positionRoles || {};   // 例: { "店長": ["discordRoleId"], ... }

  const memberRoleIds = new Set(member.roles.cache.map((r) => r.id));

  for (const roleKey of approverRoles) {
    const discordRoleIds = positionRoles[roleKey];
    if (!Array.isArray(discordRoleIds)) continue;

    for (const discordRoleId of discordRoleIds) {
      if (memberRoleIds.has(discordRoleId)) {
        return true;
      }
    }
  }

  return false;
}

module.exports = {
  isApproverMember,
};