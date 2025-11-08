// src/handlers/tennai_hikkakeBotHandler.js
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

// コマンド・ボタンハンドラーをロード
const commandsPath = path.join(__dirname, '..', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const buttonsPath = path.join(__dirname, 'tennai_hikkake', 'buttons');
// Check if the buttons directory exists before trying to read it
const buttonFiles = fs.existsSync(buttonsPath)
  ? fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'))
  : [];

module.exports = (client) => {
  client.commands = new Collection();
  client.buttons = new Collection();

  // ────────────────
  // コマンド登録
  // ────────────────
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }

  // ────────────────
  // ボタンハンドラー登録
  // ────────────────
  for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);
    client.buttons.set(button.customId, button);
  }
};