const repo = require('../SyutRepository');
const service = require('../SyutService');
const { handleInteractionError } = require('../../../utils/errorHandlers');

async function sendSyutSettingPanel(interaction) {
    try {
        const { guild } = interaction;
        if (!guild) return;

        // --------------------------------------------
        // 設定取得 (Service経由)
        // --------------------------------------------
        const { config } = await service.prepareSettingData(guild.id);

        // キャストパネルサマリー
        const castText = (config.castPanelList && Object.keys(config.castPanelList).length > 0)
            ? Object.entries(config.castPanelList).map(([store, info]) => `・${store}：<#${info.channelId}>`).join('\n')
            : '未設置';

        // 黒服パネルサマリー
        const kuroText = (config.kurofukuPanelList && Object.keys(config.kurofukuPanelList).length > 0)
            ? Object.entries(config.kurofukuPanelList).map(([store, info]) => `・${store}：<#${info.channelId}>`).join('\n')
            : '未設置';

        const { approveRoleId } = config;
        const approveRoleText = approveRoleId ? `<@&${approveRoleId}>` : '未設定';

        // --------------------------------------------
        // Panel Construction (PanelBuilder)
        // --------------------------------------------
        const builder = new PanelBuilder()
            .setTitle('🕐 出退勤設定パネル')
            .setDescription('出退勤機能に関する設定を行うパネルです。')
            .setColor(getEmbedColor('syut', config))
            .addFields([
                { name: '設置店舗 (キャスト)', value: castText, inline: false },
                { name: '設置店舗 (黒服)', value: kuroText, inline: false },
                { name: '出退勤承認役職', value: `役職名：${approveRoleText}`, inline: false }
            ])
            .setFooter(getBotFooter(interaction).text);

        builder.addButtons([
            { id: 'syut:setting:installCast', label: 'キャストパネル設置', style: ButtonStyle.Primary },
            { id: 'syut:setting:installKuro', label: '黒服パネル設置', style: ButtonStyle.Secondary },
            { id: 'syut:setting:csv', label: 'CSV出力', style: ButtonStyle.Success },
        ]);

        builder.addButtons([
            { id: 'syut:setting:approveRole', label: '承認役職設定', style: ButtonStyle.Secondary }
        ]);

        const payload = builder.toJSON();

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(payload);
        } else {
            await interaction.reply(payload);
        }
    } catch (err) {
        await handleInteractionError(interaction, err);
    }
}

module.exports = {
    sendSyutSettingPanel,
};
