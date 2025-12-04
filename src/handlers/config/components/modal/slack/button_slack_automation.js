// src/handlers/config/components/button/slack/button_slack_automation.js

const modal = require('../../modal/slack/modal_slack_webhook');

module.exports = {
  customId: 'config_slack_auto',

  async handle(interaction) {
    return modal.show(interaction);
  },
};
