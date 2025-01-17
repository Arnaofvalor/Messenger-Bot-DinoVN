import { Collection } from "@discordjs/collection";
import { Command, Event } from "../interfaces/index.ts";
import fs from "node:fs";
import { aliases, commands } from "../index.ts";
import { getPrefix } from "../module/prefix.ts";
import { api } from "../interfaces/Map.ts";

const requestCountTime = 2;

function urlify(text: string): RegExpMatchArray | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex);
}

async function runCommand(
  command: Command,
  api: api,
  bot_event: any,
  args: string[]
) {
  if ((command as Command).permission == "everyone")
    (command as Command).execute(api, bot_event, args);
  else if ((command as Command).permission == "admin") {
    const ThreadInfo = await api.getThreadInfo(bot_event.threadID);
    // console.log(api.getCurrentUserID())
    if (
      !ThreadInfo.adminIDs.includes(bot_event.senderID)
    ) if (!api.config.ADMIN_BYPASS && bot_event.senderID == api.config.OWNER_ID) 
      return api.sendMessage(
        "Bạn không phải là quản trị viên nên không thể sử dụng lệnh này",
        bot_event.threadID,
        bot_event.messageID
      );

    if (
      !ThreadInfo.adminIDs.includes(api.getCurrentUserID())
    ) if (!api.config.BOT_ADMIN_BYPASS && bot_event.senderID == api.config.OWNER_ID)
      return api.sendMessage(
        `Bot không phải là quản trị viên!`,
        bot_event.threadID,
        bot_event.messageID
      );

    (command as Command).execute(api, bot_event, args);
  } else if ((command as Command).permission == "owner") {
    if (bot_event.senderID == api.config.OWNER_ID)
      (command as Command).execute(api, bot_event, args);
  }
}

export const event: Event = {
  name: ["message", "message_reply"],
  async execute(api, event) {
    const perfix: string =
      (await getPrefix(api, event, event.threadID)) || process.env.BOT_PERFIX!;
    if (!api.cooldowns) return;
    let args = [];
    if (event.body.startsWith(perfix))
      args = event.body.slice(perfix.length).trim().split(/\s|\n/);
    else args = event.body.trim().split(/\s|\n/);

    const cmd = args.shift()!.toLowerCase();
    if (cmd.length === 0) return;

    let command = commands.get(cmd) || aliases.get(cmd);

    if (!command) return;
    if (!command.noPrefix && !event.body.startsWith(perfix)) return;

    // console.log(api.cooldowns)

    if (!api.cooldowns.has(cmd)) {
      api.cooldowns.set(cmd, {
        requestCount: new Collection<string, number>(),
        cooldowns: new Collection<string, number>(),
      });
    }

    const now = Date.now();
    const timestamps = api.cooldowns.get(cmd)!.cooldowns;
    const requestCount = api.cooldowns.get(cmd)!.requestCount;
    const defaultCooldownDuration = 5;
    const cooldownAmount =
      ((command as Command).cooldown || defaultCooldownDuration) * 1000;

    // console.log(requestCount);
    if (requestCount.get(event.senderID) == 1) return;

    if (!timestamps) return;

    if (timestamps.has(event.senderID)) {
      const expirationTime = timestamps.get(event.senderID)! + cooldownAmount;

      requestCount.set(event.senderID, 1);
      setTimeout(
        () => requestCount.delete(event.senderID),
        requestCountTime * 1000
      );

      if (now < expirationTime) {
        // const expiredTimestamp = Math.round(expirationTime / 1000);
        return api.sendMessage(
          `Xin chờ, bạn đang dùng lệnh \`${cmd}\` quá nhanh. Bạn có thể dùng lại sau ${(
            (expirationTime - now) /
            1000
          ).toFixed(0)}s.`,
          event.threadID,
          event.messageID
        );
      }
    }

    requestCount.set(event.senderID, 1);
    setTimeout(
      () => requestCount.delete(event.senderID),
      requestCountTime * 1000
    );
    timestamps.set(event.senderID, now);
    setTimeout(() => timestamps.delete(event.senderID), cooldownAmount);

    // console.log(api)
    if (typeof (command as Command).groups === "string") {
      const vgroup = (command as Command).groups as string;
      if (vgroup.toLowerCase() == "all") runCommand(command, api, event, args);
      if (vgroup.toLowerCase() == "groups" && event.isGroup)
        runCommand(command, api, event, args);
    } else if (Array.isArray((command as Command).groups)) {
      for (const group of (command as Command).groups) {
        if (group == event.threadID) runCommand(command, api, event, args);
      }
    }
  },
};
