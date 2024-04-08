import { Stream } from "node:stream";
import fs from "node:fs";
import { getFb_dtsg } from "./apiModule/tool.ts";
import { getRecommendedFriends, sendFrendRequest } from "./apiModule/friend.ts";
import { event } from "./interfaces/Map.ts";
import { Collection } from "@discordjs/collection";

export interface APIModule {
  sendComment: (body: string | { body: string, attachment: Stream | fs.ReadStream }, postId: string, callback?: (error: any, data: any) => void) => void;
  getFb_dtsg: () => Promise<string>;
  getRecommendedFriends: (callback?: (error: any, data: any) => void) => void;
  sendFrendRequest: (userID: string | string[], callback?: (error: any, data: any) => void) => void;
  on(name: string[], callback: (event: event) => void): string;
  remove(id: string): void;
}

export function API(api: any) {
  api.getFb_dtsg = getFb_dtsg
  api.getRecommendedFriends = (callback?: (error: any, data?: any) => void) => {
    getRecommendedFriends(api, callback);
  }
  api.sendFrendRequest = (userID: string | string[], callback?: (error: any, data?: any) => void) => {
    sendFrendRequest(api, userID, callback);
  }
  api.on = (name: string[], callback: (event: event) => void) => {
    const events = api.global.OnEvents;
    let fileName = Date.now()
    name.forEach((name: any) => {
      if (!events.has(fileName)) {
        events.set(fileName, new Collection<string, Event>());
      }
      const eventfile = events.get(fileName)
      eventfile!.set(name, {
        execute: callback
      });
    });
    return fileName;
  }
  api.remove = (id: string) => {
    const events = api.global.OnEvents;
    if(events.has(id)) {
      events.delete(id)
    }
  }
  return api;
}