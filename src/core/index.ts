import { loadingAnimation, doneAnimation, errAnimation } from "./module/console.ts";

import fbchat from "dinovn-fca";
import fs from "node:fs";

import { Collection } from "@discordjs/collection";

import { Command, Cooldown, Event, Function } from "./interfaces/index.ts";
import { api } from "./interfaces/Map.ts";
// @ts-ignore
import botConfig from "../../bot.config.js";
import { checkUpdate } from "./module/update.ts";
import { users } from "./module/data.ts";
import { API } from "./api.ts";
import process from "node:process";

const events: Collection<string, Collection<string, Event>> = new Collection();
const OnEvents: Collection<string, Collection<string, {
  execute: (event: any) => void
}>> = new Collection();
const commands: Collection<string, Command> = new Collection();
const aliases: Collection<string, Command> = new Collection();
const cooldowns: Collection<string, Cooldown> = new Collection();

let runtime = "unknown";

if (process.env.NODE) {
  runtime = "node";
} else {
  try {
    if (Deno) {
      runtime = "deno";
    }
  } catch (e) {}
  try {
    if (Bun) {
      runtime = "bun";
    }
  } catch (e) {}
}

const CommandFiles = fs
  .readdirSync("./src/commands")
  .filter((file) => file.endsWith(".ts"));

for (const file of CommandFiles) {
  try {
    import(`../commands/${file}`).then(command => {
      command = command.command;
      if (!command || !command.name || !command.execute)
        console.error(`Hãy khiểm tra lại lệnh ${file}`);
      else {
        commands.set(command.name, command);
    
        if (command.aliases && command.aliases.length !== 0) {
          command.aliases.forEach((alias: any) => {
            aliases.set(alias, command);
          });
        }
        if(command.preload) {
          try {
            command.preload()
          } catch (e) {
            console.error(`Lỗi khi chạy preload của lệnh ${file}`, e)
          }
        }
      }
    })
  } catch (error) {
    console.error(`Lỗi khi load lệnh ${file}:`, error)
  }
}

const core_CommandFiles = fs
  .readdirSync("./src/core/commands")
  .filter((file) => file.endsWith(".ts"));

for (const file of core_CommandFiles) {
  try {
    import(`./commands/${file}`).then(command => {
      command = command.command;
      if (!command || !command.name || !command.execute)
      console.error(`Lỗi khi load core command ${file} hãy báo lỗi trên github`);
      else {
        commands.set(command.name, command);
    
        if (command.aliases && command.aliases.length !== 0) {
          command.aliases.forEach((alias: any) => {
            aliases.set(alias, command);
          });
        }
      }
    })
  } catch (error) {
    console.error(`Lỗi khi load core command ${file} hãy báo lỗi trên github:`, error)
  }
}

const eventFiles = fs
  .readdirSync("./src/events")
  .filter((file) => file.endsWith(".ts"));
for (const file of eventFiles) {
  try {
    import(`../events/${file}`).then(event => {
      event = event.event;
      if (!event || !event.name || !event.execute) console.error(`Hãy khiểm tra lại event ${file}`);
      else {
        event.name.forEach((name: any) => {
          if (!events.has(file)) {
            events.set(file, new Collection<string, Event>());
          }
          const eventfile = events.get(file)
          eventfile!.set(name, event);
        });
      }
    });
  } catch (error) {
    console.error(`Lỗi khi load event ${file}:`, error)
  }
}

const core_eventFiles = fs
  .readdirSync("./src/core/events")
  .filter((file) => file.endsWith(".ts"));
for (const file of core_eventFiles) {
  try {
    import(`./events/${file}`).then(event => {
      event = event.event;
      if (!event || !event.name || !event.execute) console.error(`Lỗi khi load core event ${file} hãy báo lỗi trên github`);
      else {
        event.name.forEach((name: any) => {
          let fileName = "core_" + file
          if (!events.has(fileName)) {
            events.set(fileName, new Collection<string, Event>());
          }
          const eventfile = events.get(fileName)
          eventfile!.set(name, event);
        });
      }
    });
  } catch (error) {
    console.error(`Lỗi khi load event ${file}:`, error)
  }
}

let restartCount = 0

function handleRestartCount() {
	restartCount++;
	setTimeout(() => {
		restartCount--;
	}, 1 * 60 * 1000);
}

function loadMqtt(api: api) {
  const event = api.listenMqtt(async (err: any, event: any) => {
    // console.log(api.guilds)
    if (err) {
      console.error(err);
      handleRestartCount()
      if(err.error == 'Not logged in') return console.error("Đã dừng thử chạy lại Mqtt vì cần thay thế appstate")
      if(restartCount > 3) return console.error("Thử chạy lại Mqtt 3 lần vẫn lỗi hãy kiểm tra lại!")
      console.info("Đang chạy lại Mqtt do lỗi")
      loadMqtt(api);
      return;
    }

    api.ban_list = []

    const local = await users.find({ banned: true })
    local.forEach(async (user: any) => {
      if (user.banned) {
        api.ban_list.push(user.id)
      }
    })

    const public_list = await users.find({ public_ban: true })
    public_list.forEach(async (user: any) => {
      if (user.public_ban) {
        api.ban_list.push(user.id)
      }
    })

    if (event.senderID && api.ban_list.includes(event.senderID)) return
    if (event.author && api.ban_list.includes(event.author)) return

    events.map(eventfile => {
      let hevent = eventfile.get(event.type);
      if (hevent) (hevent as Event).execute(api, event);
    });
    OnEvents.map(eventfile => {
      let hevent = eventfile.get(event.type);
      if (hevent) (hevent as any).execute(event);
    })
  });
  setTimeout(() => {
    event.stopListening()
    loadMqtt(api)
  }, 3 * 60 * 60 * 1000)
}

async function startBot() {
  if(!fs.existsSync("./appstate.json")) {
    console.error("Không tìm thấy appstate.json, hãy tạo mới")
    if (process.send) process.send("stop")
    return 
  }

  let loading = loadingAnimation("Đang kết nối với Facebook...");
  
  fbchat(
    { appState: JSON.parse(fs.readFileSync("./appstate.json", "utf8")) }, 
    {
      listenEvents: true,
      autoMarkDelivery: false,
      // userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
      updatePresence: true,
      logLevel: "silent"
    },
    async (err: any, api: any) => {
      if (err) {
        if (err.code == "ETIMEDOUT") {
          errAnimation("Đang kết nối với Facebook...", loading)
          console.warn("Lỗi timeout, đang thử lại");
          startBot();
        } else {
          errAnimation("Đang kết nối với Facebook...", loading)
          console.error(err);
          if (process.send) process.send("stop")
        }
        return;
      }

      const env = await loadEnv()
      api.env = env
      api.runtime = runtime

      doneAnimation("Đang kết nối với Facebook...", loading)

      api = API(api);

      api.commands = commands;
      api.aliases = aliases;
      api.cooldowns = cooldowns;
      api.events = events;
      api.global = {};
      api.global.OnEvents = OnEvents;

      const userId = api.getCurrentUserID()
      const user = await api.getUserInfo([userId])

      console.info(`Đã kết nối với ${user[userId] ? user[userId].name : null} (${userId})`)
      
      try {
        // @ts-ignore
        import("../../bot.config.js").then(config => {
          api.config = config.default;
        })
      } catch (error) {
        console.error("Lỗi khi load bot.config.js hãy kiểm tra lại file config", error)
        if (process.send) process.send("stop")
        return
      }

      console.info(`Đã load ${commands.size} lệnh`)
      console.info(`Đã load ${events.size} events`)
      
      let NfunctionFile = 0

      const core_functionFiles = fs
        .readdirSync("./src/core/functions")
        .filter((file) => file.endsWith(".ts"));
      for (const file of core_functionFiles) {
        try {
          let functionFile = await import(`./functions/${file}`);
          functionFile = functionFile.functionFile;
          if (!functionFile || !functionFile.execute) console.error(`Lỗi khi load core function ${file} hãy báo lỗi trên github`);
          else {
            functionFile.execute(api)
            NfunctionFile++
          }
        } catch (error) {
          console.error(`Lỗi khi load core function ${file} hãy báo lỗi trên github:`, error);
        }
      }

      const functionFiles = fs
        .readdirSync("./src/functions")
        .filter((file) => file.endsWith(".ts"));
      for (const file of functionFiles) {
        try {
          let functionFile = await import(`../functions/${file}`);
          functionFile = functionFile.functionFile;
          if (!functionFile || !functionFile.execute) console.error(`Hãy khiểm tra lại function ${file}`);
          else {
            functionFile.execute(api)
            NfunctionFile++
          }
        } catch (error) {
          console.error(`Lỗi khi load function ${file}:`, error)
        }
      }

      console.info(`Đã load ${NfunctionFile} functions file`)

      api.uptime = Date.now();

      loadMqtt(api);
    }
  );
}

async function loadEnv() {
  if (runtime === "node") {
    if (!fs.existsSync(".env")) {
      console.error("Không tìm thấy file .env, hãy tạo mới");
      if (process.send) process.send("stop");
      return;
    }
    import("dotenv/config");
    return process.env
  } else if (runtime === "deno") {
    if (!fs.existsSync("./.env")) {
      console.error("Không tìm thấy file .env, hãy tạo mới");
      if (process.send) process.send("stop");
      return;
    }
    const { load } = await import("https://deno.land/std@0.221.0/dotenv/mod.ts")
    const env = await load({
      envPath: "./.env"
    })
    return env
  }
}

if (botConfig.UPDATE) {
  checkUpdate(() => startBot());
} else { startBot() }
export { events, commands, aliases, cooldowns, runtime }