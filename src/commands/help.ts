import { Command } from "../core/interfaces/index.ts";
import fs from "node:fs";
import { getPrefix } from "../core/module/prefix.ts";

export const command: Command = {
  name: "help",
  aliases: [],
  description: "Hiện tất cả các lệnh có thể dùng lệnh",
  groups: "All",
  permission: "everyone",
  execute: async (api, event, args) => {
    // api.sendMessage('pong', event.threadID, event.messageID);
    const ThreadInfo = await api.getThreadInfo(event.threadID);

    let commands: any[] = [];

    api.commands.forEach((command) => {
      let data = {
        name: command.name,
        aliases: command.aliases,
        description: command.description,
        permission: command.permission,
        prefix: command.noPrefix
      };
      if (command.permission == "everyone") {
        commands.push(data);
      } else if (command.permission == "admin") {
        if (
          ThreadInfo.adminIDs.includes(event.senderID) ||
          (api.config.ADMIN_BYPASS &&
            event.senderID == api.config.OWNER_ID &&
            ThreadInfo.adminIDs.includes(event.senderID))
        ) {
          commands.push(data);
        }
      } else if (command.permission == "owner") {
        if (event.senderID == api.config.OWNER_ID) {
          commands.push(data);
        }
      }
    })

    let prefix = await getPrefix(api, event, event.threadID)
    
    try {
      const help =
        `Những lệnh hiện có ${event.isGroup && ThreadInfo.threadName != null? `trong \`${ThreadInfo.threadName}\`` : "của bot"}:\n` +
        commands.map(
          (command) =>
            `${!command.prefix ? prefix : ""}${command.name} ${
              command.aliases.length == 0
                ? ""
                : "[" +
                  command.aliases.map((alias: string) => alias).join(", ") +
                  "]"
            }\n${command.description}`
        ).join("\n");
      // console.log(help);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
      api.sendMessage(help, event.senderID);
    } catch (error) {
      console.log(error);
      api.sendMessage("Có vẻ bot không nhắn được với bạn hãy kết bạn với bot!", event.threadID, event.messageID);
    }
  },
};
