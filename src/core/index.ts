import "console-info";
import "console-warn";
import "console-error";
import "dotenv/config";

// const fbchat = require("facebook-chat-api")
// import fbchat from "@xaviabot/fca-unofficial";
import fbchat from "nhatcoder-fb-api";
import fs from "fs";

import { Collection } from "@discordjs/collection";

import { Command, Cooldown, Event, Function } from "./interfaces/index.ts";
// import { api, event } from "./interfaces/Map.ts";

const events: Collection<string, Collection<string, Event>> = new Collection();
const commands: Collection<string, Command> = new Collection();
const aliases: Collection<string, Command> = new Collection();
const cooldowns: Collection<string, Cooldown> = new Collection();

const CommandFiles = fs
  .readdirSync("./src/commands")
  .filter((file) => file.endsWith(".ts"));

for (const file of CommandFiles) {
  import(`../commands/${file}`).then(command => {
    command = command.command;
    // const command = require(`../commands/${file}`).command;
    // console.log(command)
    if (!command || !command.name || !command.execute)
      console.error(`Hãy khiểm tra lại lệnh ${file}`);
    else {
      commands.set(command.name, command);
  
      if (command.aliases.length !== 0) {
        command.aliases.forEach((alias: any) => {
          aliases.set(alias, command);
        });
      }
    }
  })
}

const eventFiles = fs
  .readdirSync("./src/events")
  .filter((file) => file.endsWith(".ts"));
for (const file of eventFiles) {
  import(`../events/${file}`).then(event => {
    // const event = require(`../events/${file}`).event;
    event = event.event;
    if (!event || !event.name || !event.execute) console.error(`Hãy khiểm tra lại event ${file}`);
    else {
      event.name.forEach((name: any) => {
        // console.log(name)
        // if(event.type == name) event.execute(api, event)
        if (!events.has(file)) {
          events.set(file, new Collection<string, Event>());
        }
        const eventfile = events.get(file)
        eventfile!.set(name, event);
      });
    }
  });
}

function startBot() {
  fbchat(
    { appState: JSON.parse(fs.readFileSync("./appstate.json", "utf8")) },
    async (err: any, api: any) => {
      if (err) {
        console.error(err);
        if (err.code == "ETIMEDOUT") {
          console.warn("Lỗi timeout, đang thử lại");
          startBot();
        }
        return;
      }

      api.commands = commands;
      api.aliases = aliases;
      api.cooldowns = cooldowns;
      api.events = events;

      const functionFiles = fs
        .readdirSync("./src/functions")
        .filter((file) => file.endsWith(".ts"));
      for (const file of functionFiles) {
        let functionFile = await import(`../functions/${file}`);
        functionFile = functionFile.functionFile;
        // const functionFile = require(`../functions/${file}`).functionFile;
        if (!functionFile || !functionFile.execute) console.error(`Hãy khiểm tra lại function ${file}`);
        else {
          functionFile.execute(api)
        }
      }

      //refesh appstate
      fs.writeFileSync("./appstate.json", JSON.stringify(api.getAppState()));

      api.setOptions({
        listenEvents: true,
        // userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
        updatePresence: true,
        autoReconnect: true,
      });

      api.uptime = Date.now();

      api.listenMqtt(async (err: any, event: any) => {
        // console.log(api.guilds)
        if (err) {
          console.error(err);
          return;
        }

        // console.log(events)
        events.map(eventfile => {
          let hevent = eventfile.get(event.type);
          // console.log(hevent)
          if (hevent) (hevent as Event).execute(api, event);
        });

        // switch (event.type) {
        //   default:
        //     // console.log(event)
        //     break;
        // }
      });
    }
  );
}

startBot();
export { events, commands, aliases, cooldowns };
