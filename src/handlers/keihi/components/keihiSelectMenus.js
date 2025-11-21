// src/handlers/keihi/components/keihiSelectMenus.js
// ----------------------------------------------------
// 経費機能で使用するセレクトメニュー UI
// ----------------------------------------------------

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

// =====================================================
// 店舗選択メニュー
// =====================================================
function menuStoreSelect(stores, customId = "keihi_store_select", placeholder = "店舗を選択") {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(
        stores.map((s) => ({
          label: s,
          value: s,
        }))
      )
  );
}

// =====================================================
// 役職種別の選択メニュー
// （承認 / 閲覧 / 申請）
// =====================================================
function menuRoleTypeSelect(customId = "keihi_role_type_select") {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("編集する役職種別を選択")
      .addOptions([
        { label: "🛡️ 承認役職", value: "approvalRoles" },
        { label: "👁️ 閲覧役職", value: "viewRoles" },
        { label: "📝 申請役職", value: "applyRoles" },
      ])
  );
}

// =====================================================
// 役職一覧の編集（複数選択）
// =====================================================
function menuRoleListEdit(roles, roleType) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`keihi_role_update:${roleType}`)
      .setPlaceholder("役職を選択（複数選択可）")
      .setMinValues(0)
      .setMaxValues(roles.length)
      .addOptions(
        roles.map((r) => ({
          label: r,
          value: r,
        }))
      )
  );
}

// =====================================================
// （任意）月選択メニュー
// =====================================================
function menuMonthSelect(customId = "keihi_month_select") {
  const options = [];
  for (let m = 1; m <= 12; m++) {
    options.push({
      label: `${m}月`,
      value: String(m).padStart(2, "0"),
    });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("月を選択")
      .addOptions(options)
  );
}

// =====================================================
// （任意）年選択メニュー
// =====================================================
function menuYearSelect(customId = "keihi_year_select", range = 3) {
  const current = new Date().getFullYear();
  const options = [];

  for (let i = range; i >= 0; i--) {
    const y = current - i;
    options.push({ label: `${y}年`, value: `${y}` });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("年を選択")
      .addOptions(options)
  );
}

module.exports = {
  menuStoreSelect,
  menuRoleTypeSelect,
  menuRoleListEdit,
  menuMonthSelect,
  menuYearSelect,
};
