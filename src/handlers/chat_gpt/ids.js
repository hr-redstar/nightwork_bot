// src/handlers/chat_gpt/ids.js
// ----------------------------------------------------
// ChatGPT設定関連の customId / その他ID 定義
// ----------------------------------------------------

const IDS = {
  // 設定パネルのボタン
  BTN_TODAY_SETTING: 'chatgpt_today_setting',          // 今日のchat gpt設定
  BTN_TODAY_EDIT: 'chatgpt_today_setting_edit',        // 今日のchat gpt設定編集
  BTN_ANSWER_CHANNEL: 'chatgpt_answer_channel',        // chatgpt回答チャンネル設定
  BTN_USAGE: 'chatgpt_usage',                          // chat gpt使用率
 
  // 今日のchat gpt設定フロー
  SEL_TODAY_STORE_CHANNEL: 'chatgpt_sel_today_store_ch', // 店舗 + チャンネル選択
  MODAL_TODAY_SETTING: 'chatgpt_modal_today_setting',    // 設定モーダル
 
  // 今日のchat gpt 実行ボタン（各店舗チャンネル用）
  BTN_TODAY_RUN_PREFIX: 'chatgpt_today_run_',           // 例: chatgpt_today_run_<storeId>
};

module.exports = { IDS };
