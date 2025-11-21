// src/handlers/config/components/button/slack/button_slack_automation.js

const modal = require('../../modal/slack/modal_slack_webhook');

module.exports = {
  customId: 'CONFIG_SLACK_AUTOMATION',

  async handle(interaction) {
    return modal.show(interaction);
  },
};
