// src/modules/common/utils/embed/getBotFooter.js

module.exports = function getBotFooter(ctx) {
  const client = ctx.client ?? ctx;
  
  const botDisplayName =
    ctx.guild?.members?.me?.displayName ??
    client.user.username;

  return {
    text: botDisplayName,
    iconURL: client.user.displayAvatarURL(),
  };
};
