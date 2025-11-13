/*
Migration script to update existing URIAGE (売上) panel messages and panelList entries.
- For each guild the bot is in, load panelList via gcsUriageManager.getUriagePanelList
- For each panel entry { store, channel, messageId }, ensure messageId exists; if not, search recent messages in channel for an embed titled '売上報告パネル' and capture its id.
- Ensure the panel message's report button customId includes the store identifier: "uriage:report:open:STORE". If it doesn't, edit the message to update the component's customId.
- Save updated panelList back via saveUriagePanelList.

Run with: node .\scripts\migrate_uriage_panels.js
Requires DISCORD_TOKEN env var and that the bot can fetch channels/messages and edit messages.
*/

require('dotenv').config();
const client = require('../src/botClient');
const { IDS } = require('../src/handlers/uriage/ids');
const { getUriagePanelList, saveUriagePanelList } = require('../src/utils/uriage/gcsUriageManager');

async function migrate() {
  console.log('Migration started');
  const guilds = client.guilds.cache.map(g => g.id);
  for (const guildId of guilds) {
    try {
      console.log(`\n--- Guild: ${guildId} ---`);
      const panelList = await getUriagePanelList(guildId);
      if (!panelList || !panelList.length) {
        console.log(' no panels');
        continue;
      }

      let changed = false;
      for (const p of panelList) {
        const { store, channel: channelId, messageId } = p;
        try {
          const guild = await client.guilds.fetch(guildId).catch(() => null);
          if (!guild) continue;
          const channel = await guild.channels.fetch(channelId).catch(() => null);
          if (!channel || !channel.isTextBased?.()) {
            console.log(` channel ${channelId} not available`);
            continue;
          }

          let msg = null;
          if (messageId) {
            msg = await channel.messages.fetch(messageId).catch(() => null);
            if (!msg) {
              console.log(` message ${messageId} not found in channel ${channelId}, searching recent messages...`);
            }
          }

          if (!msg) {
            const msgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
            const found = msgs && msgs.find(m => m.embeds?.[0]?.title && m.embeds[0].title.includes('売上報告パネル'));
            if (found) {
              msg = found;
              p.messageId = found.id;
              changed = true;
              console.log(` found panel message ${found.id} for channel ${channelId}`);
            }
          }

          if (!msg) {
            console.log(' no panel message found, skipping');
            continue;
          }

          // inspect components for report button
          const components = msg.components || [];
          let edited = false;
          for (const row of components) {
            for (const comp of row.components) {
              if (!comp.customId) continue;
              if (comp.customId.startsWith(IDS.BTN_REPORT_OPEN)) {
                // if it's already in new format (has additional segment), skip
                const parts = comp.customId.split(':');
                if (parts.length >= 4) continue; // already uriage:report:open:STORE
                // need store value
                let storeId = store;
                if (!storeId) {
                  // try to extract from embed title if present
                  const title = msg.embeds?.[0]?.title || '';
                  const m = title.match(/\(([^)]+)\)$/);
                  if (m && m[1]) storeId = m[1];
                }
                if (!storeId) {
                  console.log(' cannot determine store for panel message, skipping button update');
                  continue;
                }

                const newCustomId = `${IDS.BTN_REPORT_OPEN}:${storeId}`;
                comp.customId = newCustomId; // mutate (discord.js v14 serializes components)
                edited = true;
                console.log(` updated button customId -> ${newCustomId}`);
              }
            }
          }

          if (edited) {
            // rebuild components to raw format
            const raw = msg.components.map(r => ({ type: r.type, components: r.components.map(c => ({ ...c })) }));
            await msg.edit({ components: msg.components }).catch(err => { console.warn(' failed to edit message components:', err.message); });
          }
        } catch (e) {
          console.warn(' panel processing error:', e.message);
        }
      }

      if (changed) {
        await saveUriagePanelList(guildId, panelList).catch(e => console.warn(' failed to save panelList:', e.message));
        console.log(' panelList updated and saved');
      } else {
        console.log(' no changes for this guild');
      }
    } catch (e) {
      console.warn(' guild migration error:', e.message);
    }
  }

  console.log('\nMigration finished');
  process.exit(0);
}

client.once('ready', () => {
  migrate().catch(e => { console.error('Migration failed:', e); process.exit(1); });
});

(async () => {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('DISCORD_TOKEN not set in env');
    process.exit(1);
  }
  try {
    await client.login(token);
  } catch (e) {
    console.error('Login failed:', e.message);
    process.exit(1);
  }
})();
