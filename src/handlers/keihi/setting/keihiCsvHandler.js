// src/handlers/keihi/keihiCsvHandler.js
// ------------------------------------------------------
// 経費CSV発行フロー
// ① 店舗選択
// ② 年月日 / 年月 / 四半期 選択
// ③ CSV生成・添付
// ------------------------------------------------------

const {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");

const dayjs = require("dayjs");
const { getStoreList } = require("../../../utils/config/configAccessor");
const { readJSON, listFiles } = require("../../../utils/gcs");
const { loadKeihiConfig } = require("../../../utils/keihi/keihiConfigManager");

module.exports = {
  // -----------------------------------------
  // ① 店舗選択メニュー
  // -----------------------------------------
  async selectStore(interaction) {
    const guildId = interaction.guild.id;
    const storeList = await getStoreList(guildId);

    if (!storeList.length) {
      return interaction.reply({
        content: "⚠️ 店舗が設定されていません。",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("keihi_csv_select_store")
      .setPlaceholder("店舗を選択してください")
      .addOptions(storeList.map((store) => ({
        label: store,
        value: store,
      })));

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.reply({
      content: "📁 CSVを発行する店舗を選択してください。",
      components: [row],
      ephemeral: true,
    });
  },

  // -----------------------------------------
  // ② 日付/年月/四半期 の選択肢生成
  // -----------------------------------------
  async selectPeriod(interaction, store) {
    const guildId = interaction.guild.id;

    // keihi ディレクトリ一覧を取得
    const basePath = `GCS/${guildId}/keihi/${store}/`;
    const yearDirs = await listFiles(basePath, { directoriesOnly: true });

    if (!yearDirs.length) {
      return interaction.reply({
        content: "⚠️ この店舗には経費データがありません。",
        ephemeral: true,
      });
    }

    const dateOptions = [];
    const monthOptions = [];
    const quarterOptions = new Set();

    // ディレクトリを走査して抽出
    for (const year of yearDirs) {
      const yearPath = `${basePath}${year}/`;
      const monthDirs = await listFiles(yearPath, { directoriesOnly: true });

      for (const month of monthDirs) {
        const monthPath = `${yearPath}${month}/`;
        const dayDirs = await listFiles(monthPath, { directoriesOnly: true });

        // 日付候補
        for (const day of dayDirs) {
          dateOptions.push({
            label: `${year}-${month}-${day}`,
            value: `${year}-${month}-${day}`,
          });
        }

        // 年月候補
        monthOptions.push({
          label: `${year}-${month}`,
          value: `${year}-${month}`,
        });

        // 四半期候補
        const q = Math.ceil(Number(month) / 3); // 1〜3月 = Q1
        quarterOptions.add(`${year}-Q${q}`);
      }
    }

    // ----------------------------
    // 選択メニュー作成
    // ----------------------------
    const dateMenu = new StringSelectMenuBuilder()
      .setCustomId(`keihi_csv_date:${store}`)
      .setPlaceholder("年月日を選択")
      .addOptions(dateOptions.slice(0, 25));

    const monthMenu = new StringSelectMenuBuilder()
      .setCustomId(`keihi_csv_month:${store}`)
      .setPlaceholder("年月を選択")
      .addOptions(monthOptions.slice(0, 25));

    const quarterMenu = new StringSelectMenuBuilder()
      .setCustomId(`keihi_csv_quarter:${store}`)
      .setPlaceholder("四半期を選択")
      .addOptions([...quarterOptions].map((q) => ({ label: q, value: q })));

    return interaction.update({
      content: `📁 **${store}** のCSV対象期間を選んでください。`,
      components: [
        new ActionRowBuilder().addComponents(dateMenu),
        new ActionRowBuilder().addComponents(monthMenu),
        new ActionRowBuilder().addComponents(quarterMenu),
      ],
    });
  },

  // -----------------------------------------
  // ③ CSV生成・添付
  // -----------------------------------------
  async exportCsv(interaction, store, mode, key) {
    const guildId = interaction.guild.id;

    let filesToRead = [];

    // モード別に対象ファイルを決める
    if (mode === "date") {
      // YYYY-MM-DD
      const [y, m, d] = key.split("-");
      const path = `GCS/${guildId}/keihi/${store}/${y}/${m}/${d}/`;
      filesToRead = await listFiles(path);
    }

    if (mode === "month") {
      const [y, m] = key.split("-");
      const path = `GCS/${guildId}/keihi/${store}/${y}/${m}/`;
      const dayDirs = await listFiles(path, { directoriesOnly: true });

      for (const d of dayDirs) {
        const p = `${path}${d}/`;
        const f = await listFiles(p);
        filesToRead.push(...f);
      }
    }

    if (mode === "quarter") {
      const [y, q] = key.split("-Q");
      const months = {
        1: ["01", "02", "03"],
        2: ["04", "05", "06"],
        3: ["07", "08", "09"],
        4: ["10", "11", "12"],
      }[Number(q)];

      for (const m of months) {
        const path = `GCS/${guildId}/keihi/${store}/${y}/${m}/`;
        const dayDirs = await listFiles(path, { directoriesOnly: true });

        for (const d of dayDirs) {
          const p = `${path}${d}/`;
          const f = await listFiles(p);
          filesToRead.push(...f);
        }
      }
    }

    if (!filesToRead.length) {
      return interaction.reply({
        content: "⚠️ 期間内のデータがありません。",
        ephemeral: true,
      });
    }

    // ----------------------------
    // JSONを読み込み → CSVへ
    // ----------------------------
    const rows = [];

    for (const file of filesToRead) {
      const data = await readJSON(file).catch(() => null);
      if (!data) continue;

      rows.push({
        date: data.date || "",
        dept: data.dept || "",
        item: data.item || "",
        price: data.price || "",
        note: data.note || "",
        inputUser: data.inputUser || "",
        inputTime: data.inputTime || "",
        modifyUser: data.modifyUser || "",
        modifyTime: data.modifyTime || "",
        approveUser: data.approveUser || "",
        approveTime: data.approveTime || "",
        deleteUser: data.deleteUser || "",
        deleteTime: data.deleteTime || "",
      });
    }

    // ----------------------------
    // CSV文字列へ変換
    // ----------------------------
    let csv = "日付,部署,項目,金額,備考,入力者,入力時間,修正者,修正時間,承認者,承認時間,削除者,削除時間\n";

    for (const r of rows) {
      csv += [
        r.date,
        r.dept,
        r.item,
        r.price,
        r.note?.replace(/,/g, "、"), // CSV対策
        r.inputUser,
        r.inputTime,
        r.modifyUser,
        r.modifyTime,
        r.approveUser,
        r.approveTime,
        r.deleteUser,
        r.deleteTime,
      ].join(",") + "\n";
    }

    const buffer = Buffer.from(csv, "utf-8");

    const filename = `${store}_${mode}_${key}.csv`;
    const attachment = new AttachmentBuilder(buffer, { name: filename });

    return interaction.reply({
      content: `📁 **CSV発行完了**\n店舗：${store}\n対象：${key}`,
      files: [attachment],
      ephemeral: true,
    });
  },
};
