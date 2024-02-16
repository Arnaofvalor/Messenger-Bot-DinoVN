import { Command } from '../interfaces/index.ts';
import { users } from '../module/data.ts';

export const command: Command = {
  name: 'ban',
  aliases: [''],
  description: "Ban ai đó không được dùng bot nữa",
  groups: "All",
  permission: "owner",
  execute: async(api, event, args) => {
    let uid = "0"
    let reason = "Không có lý do"
 
    if(event.messageReply) {
      uid = event.messageReply.senderID
      if (!args[0]) return api.sendMessage("Vui lòng nhập lý do ban", event.threadID, event.messageID)
      reason = args.join(" ")
    } else if(args[0]) {
      uid = args[0]
      if (!args[1]) return api.sendMessage("Vui lòng nhập lý do ban", event.threadID, event.messageID)
      reason = args.slice(1).join(" ")
    }

    if(uid == "0") return api.sendMessage("Vui lòng nhập ID/Reply người dùng cần ban", event.threadID, event.messageID)

    const user = users.findById(uid)
    if(!user) {
      const newUser = new users({
        _id: uid,
        banned: true,
        banReason: reason
      })
      await newUser.save()
    } else {
      await users.findByIdAndUpdate(uid, {
        banned: true,
        banReason: reason
      })
    }

    return api.sendMessage(`Đã ban ${uid} với lý do: ${reason}`, event.threadID, (error, message) => {
      setTimeout(() => {
        api.unsendMessage(message.messageID)
      }, 1000 * 10)
    }, event.messageID)
  }
}