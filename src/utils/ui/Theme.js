/**
 * src/utils/ui/Theme.js
 * ボット全体の視認性と美学を統一する「Platinum」テーマ管理
 */

const Theme = {
    // ----------------------------------------------------
    // 🎨 ブランドカラー (現在は視認性の高いグリーン)
    // ----------------------------------------------------
    COLORS: {
        BRAND: 0x2ecc71,       // Embed用数値 (Hex: #2ecc71)
        BRAND_HEX: '#2ecc71',  // CSS/Modal用文字列

        SUCCESS: 0x2ecc71,
        WARNING: 0xf1c40f,
        DANGER: 0xe74c3c,
        INFO: 0x3498db,

        // 経費・売上などの特定カラー
        REQUEST: 0x2ecc71,
        APPROVAL: 0x57f287,
        REJECT: 0xed4245,

        // 設定パネル用
        SETTING_HEADER: 0x2ecc71,
    },

    // ----------------------------------------------------
    // 💎 アイコン・絵文字
    // ----------------------------------------------------
    EMOJI: {
        SUCCESS: '✅',
        ERROR: '❌',
        WARN: '⚠️',
        INFO: 'ℹ️',
        STORE: '🏢',
        ROLE: '👥',
        MONEY: '💰',
        TIME: '🕒',
    }
};

module.exports = Theme;
