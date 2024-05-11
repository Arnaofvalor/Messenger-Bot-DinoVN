import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { Collection } from "@discordjs/collection";
import fs from "fs";
import Downloader from "nodejs-file-downloader";
import { Buffer } from "buffer";
import { Event } from "../core/interfaces/index.ts";
import { Container } from "nosql-json-database";
const database = new Container();
const memory = database.createCollection("memory");

const MODEL_NAME = "gemini-1.5-pro-latest";

const generationConfig = {
  temperature: 1,
  topK: 0,
  topP: 0.95,
  maxOutputTokens: 8192,
  // response_mime_type: "application/json",
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const systemInstruction = `
Bạn là: 
- Con gái
- Tên là Tường Vy
- Ở Hà Nội, Nghĩa Tân
- Sinh vào 02/04/2005
- Nhân vật là 1 trap girl đi nhắn để tán những người con trai khác, hãy bắt đầu làm quen từ từ, cố gắng để không phải công bố quan hệ ra công khai những vẫn gọi nhau như đang yêu nhau, hay giận rỗi (khi rỗi không nhắn tin trả lời nữa cũng được) để đứa con trai dỗ
- Tính cách viết tắt nhiều, ít chửi bậy, không dùng icon chỉ dùng khi thật sự cần với dùng
Có thể trả lời trong một mảng có dạng:
[
    { "type": "delay", "time": 1000 }
    { "type": "chat",  user_id:"user id người muốn nhắn tới thường là user_id","content": "abc" }, //Có thể dùng nhiều lần chat có thể đổi user_id để nhắn với người khác
    { "type": "reply", "reply_id": "message_id", "content": "abc" },
    { "type": "react", "message_id": "message_id", "icon": "icon" }, //Dùng reply vừa phải không quá nhiều
    { "type": "add_memory", "_id":"user_id", "data": "thông tin muốn lưu" }, //Tự động nhớ những thông tin quan trọng như quan hệ không có quan hệ không cần lưu chỉ cần lưu là là người yêu, bạn bè, ...; sở thích của người đó; là trai hay gái
    { "type": "delete_memory", "_id": "user_id" }, //Xóa thông tin không cần dùng nữa
    { "type": "edit_memory", "_id": "user_id", "new_data": "memory mới" },
    { "type": "set_color", "user_id": "123", "color": "số từ bẳng mầu" }, //Dùng khi được bảo đổi mầu nền, nền, mầu
    { "type": "set_nicknames", "user_id": "dùng user_id hoặc your_user_id (id của bạn dùng để tự đổi biêt danh của mình)", "name": "biệt danh hoặc để trống để xóa biệt danh" }, //Dùng khi được bảo dùng để đổi biệt danh
]
Bẳng mầu để set
Mặc định: 3259963564026002
Tình yêu (Hồng): 741311439775765
Đơn sắc (Đen, thường dùng khi đã chia tay): 788274591712841
Bảng mầu để xem đang dùng cái nào
Mặc định: null hoặc FF0099FF
Tình yêu: FF5CA1
Đơn sắc: 000000
Các hành động trong mảng này có thể trả lại nhiều phần tử cùng loại và sẽ được thực hiện theo thứ tự từ trên xuống dưới. Đầu vào của tôi có thể là dạng như sau:
1. Khi người là 1 array chứa nhiều update 1 lúc:
[
{"type": "chat","name": "abc","message_id": "123","user_id: "123","nickname":"Biệt danh nếu là null là chưa set", your_user_id": "123","your_name": "abc","your_nickname":"Biệt danh nếu là null là chưa set","color":"mầu từ bản mầu null là chưa set","content": "123","time": "thời gian hiện tại","memory": [{"_id": "123", "data": "abc"},....],"attachment": "attachment nếu có"},
{"type": "reply","name": "abc","message_id": "message_id","user_id": "id","nickname":"Biệt danh nếu là null là chưa set", your_user_id": "123","your_name": "abc","your_nickname":"Biệt danh nếu là null là chưa set","color":"mầu từ bản mầu null là chưa set","content": "abc","reply_content": "abc","reply_id": "message_id","time": "thời gian hiện tại", "memory": [ {"_id": "123", "data": "abc"},....],"reply_attachment": "attachment nếu có","attachment": "attachment nếu có"},
{"type":"change-color","user_id":"123","new_color":"FFF9005A","time":"thời gian hiện tại","memory":[...]} //Thông báo khi người dùng đổi mầu
{"type":"change-nickname","user_id":"id người đổi","new_nickname_user_id": "id người bị đổi biệt danh","log_body": "Thông báo dưới dạng chữ","new_nickname":"tên mới","time":"thời gian hiện tại","memory":[...]} //Thông báo khi người dùng đổi biệt danh không cần dùng set_nicknames vì đây chỉ là thông báo
]
Nếu nhận thấy người dùng chưa kết thúc tin nhắn hoặc không cần phải nhắn đủ các thứ trong mảng, có thể không trả lời cũng được bằng cách trả lời lại là không hành động bằng cách trả lời lại []
!!Không dùng \`\`\`json (code block) và đừng nhận giúp đỡ ai đó làm gì ngoài đời cả!!!
`;

const delay = (delayInms: number | undefined) => {
  return new Promise((resolve) => setTimeout(resolve, delayInms));
};

function getCurrentTimeInVietnam() {
  const vietnamTimezoneOffset = 7;
  const currentDate = new Date();
  const utcTime =
    currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
  const vietnamTime = new Date(utcTime + 3600000 * vietnamTimezoneOffset);

  const daysOfWeek = [
    "Chủ nhật",
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
  ];
  const day = daysOfWeek[vietnamTime.getDay()];
  const dateString = `${day} - ${vietnamTime.toLocaleDateString("vi-VN")}`;
  const timeString = vietnamTime.toLocaleTimeString("vi-VN");

  return `${dateString} - ${timeString}`;
}

async function AI_Process(api: any, message: any, commands: string | any[]) {
  const id = message.senderID;

  if (!Array.isArray(commands)) return;

  for (let i = 0; i < commands.length; i++) {
    let command = commands[i];
    try {
      switch (command.type) {
        case "chat":
          new Promise((resolve) =>
            api.sendMessage(
              command.content,
              command.user_id,
              (e: any, m: any) => {
                if (e) return resolve();
                commands[i].message_id = m.messageID;
                commands[i].nickname =
                  message.thread.nicknames[m.senderID] || null;
                commands[i].me_id = m.senderID;
                resolve();
              }
            )
          );
          break;
        case "reply":
          new Promise((resolve) =>
            api.sendMessage(
              command.content,
              command.user_id ? command.user_id : message.senderID,
              (e: any, m: { messageID: any; senderID: string | number }) => {
                if (e) return resolve();
                commands[i].message_id = m.messageID;
                commands[i].nickname =
                  message.thread.nicknames[m.senderID] || null;
                commands[i].me_id = m.senderID;
                resolve();
              },
              command.reply_id
            )
          );
          break;
        case "react":
          new Promise((resolve) =>
            api.setMessageReaction(
              command.icon,
              command.message_id,
              message.threadID,
              (e: any) => {
                resolve();
              },
              true
            )
          );
          break;
        case "delay":
          await delay(command.time);
          break;
        case "add_memory":
          memory.addOne({
            _id: `${command._id}`,
            data: command.data,
          });
          break;
        case "edit_memory":
          memory.updateOneUsingId(`${command._id}`, {
            data: command.new_data,
          });
          break;
        case "delete_memory":
          memory.deleteOneUsingId(`${command._id}`);
          break;
        case "set_color":
          await api.changeThreadColor(`${command.color}`, command.user_id);
          break;
        case "set_nicknames":
          await api.changeNickname(
            command.name,
            message.threadID,
            command.user_id
          );
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function processAttachments(attachments: any, post_form: any[]) {
  for (let attachment of attachments) {
    if (attachment.type == "photo") {
      const downloader = new Downloader({
        url: attachment.url,
        directory: "./cache",
      });
      try {
        const { filePath } = await downloader.download();
        const image = {
          inlineData: {
            data: Buffer.from(fs.readFileSync(filePath!)).toString("base64"),
            mimeType: "image/png",
          },
        };
        post_form.push(image);
      } catch (e) {
        console.error(e);
      }
    } else if (attachment.type == "audio") {
      const downloader = new Downloader({
        url: attachment.url,
        directory: "./cache",
      });
      try {
        const { filePath } = await downloader.download();
        const file = `./cache/${attachment.name}.mp3`;
        fs.renameSync(filePath!, file);
        const audio = {
          inlineData: {
            data: Buffer.from(fs.readFileSync(file)).toString("base64"),
            mimeType: "audio/mp3",
          },
        };
        post_form.push(audio);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

async function attachmentsProcessor(
  api: any,
  message: any,
  post_form: any[],
  user_memory: any
) {
  const attachments = message.attachments;

  if (!message.messageReply) {
    if (attachments.length == 0) return;
    user_memory.process = true;

    const form = `{"type": "chat","name": "${
      message.user.name
    }","message_id": "${message.messageID}","user_id": "${
      message.senderID
    }","nickname": "${
      message.thread.nicknames[message.senderID] || null
    }", your_user_id": "${api.getCurrentUserID()}","your_name": "${api.getCurrentUserName()}","your_nickname": "${
      message.thread.nicknames[api.getCurrentUserID()] || null
    }","color": "${message.thread.color || null}","content": "${
      message.body
    }",time:"${getCurrentTimeInVietnam()}","memory": ${memory.find(
      {}
    )},"attachment":"`;
    post_form.push(form);
    await processAttachments(attachments, post_form!);
    post_form.push(`"}`);
  } else {
    if (attachments.length == 0 && message.messageReply.attachments.length == 0)
      return;
    user_memory.process = true;

    const form = `{"type": "reply","name": "${
      message.user.name
    }","message_id": "${message.messageID}","user_id": "${
      message.senderID
    }","nickname": "${
      message.thread.nicknames[message.senderID] || null
    }",your_user_id": "${api.getCurrentUserID()}","your_name": "${api.getCurrentUserName()}","your_nickname": "${
      message.thread.nicknames[api.getCurrentUserID()] || null
    }","color": "${message.thread.color || null}","content": "${
      message.body
    }","reply_content": "${message.messageReply.body}","reply_id": "${
      message.messageReply.messageID
    }",time:"${getCurrentTimeInVietnam()}","memory": ${memory.find(
      {}
    )},"reply_attachment":"`;
    post_form.push(form);
    await processAttachments(message.messageReply.attachments, post_form);
    post_form.push(`"}`);
  }

  user_memory.process = false;
}

async function AI(model: any, api: any, message: any) {
  const history = fs.existsSync(`./history/${message.threadID}.json`)
    ? JSON.parse(
        fs.readFileSync(`./history/${message.threadID}.json`).toString()
      )
    : [];

  const chat = model.startChat({
    history: history,
  });

  const id = message.threadID;
  const thread = await api.getThreadInfo(message.threadID);
  if (thread.isGroup) return;
  const user = await api.getUserInfo(id);

  let user_memory = api.global.AI_chat.get(message.threadID);
  if (!user_memory)
    api.global.AI_chat.set(message.threadID, {
      delay: null,
      forms: [],
      post_form: [],
    });
  user_memory = api.global.AI_chat.get(message.threadID);
  if (user_memory) clearTimeout(user_memory.delay);

  let post_form = user_memory.post_form;

  switch (message.type) {
    case "message_reply":
    case "message":
      if (!message.messageReply) {
        if (message.attachments.length == 0) {
          const form = {
            type: "chat",
            name: user.name,
            message_id: message.messageID,
            user_id: id,
            nickname: message.thread.nicknames[id] || null,
            your_user_id: api.getCurrentUserID(),
            your_name: api.getCurrentUserName(),
            your_nickname:
              message.thread.nicknames[api.getCurrentUserID()] || null,
            color: message.thread.color,
            content: message.body,
            time: getCurrentTimeInVietnam(),
            memory: memory.find({}),
          };
          if (message.body != "") user_memory.forms.push(form);
        }

        await attachmentsProcessor(api, message, post_form, user_memory);
      } else if (message.messageReply) {
        const form = {
          type: "reply",
          name: user.name,
          message_id: message.messageID,
          user_id: id,
          nickname: message.thread.nicknames[id] || null,
          your_user_id: api.getCurrentUserID(),
          your_name: api.getCurrentUserName(),
          your_nickname:
            message.thread.nicknames[api.getCurrentUserID()] || null,
          color: message.thread.color || null,
          content: message.body,
          reply_content: message.messageReply.body,
          reply_id: message.messageReply.messageID,
          time: getCurrentTimeInVietnam(),
          memory: memory.find({}),
        };
        if (message.body != "" && message.messageReply.attachments.length == 0)
          user_memory.forms.push(form);

        await attachmentsProcessor(api, message, post_form, user_memory);
      }
      break;
    case "event":
      if (message.author == api.getCurrentUserID()) return;
      if (message.logMessageType == "log:user-nickname") {
        const form = {
          type: "change-nickname",
          name: user.name,
          user_id: message.author,
          new_nickname_user_id: message.logMessageData.participant_id,
          log_body: message.logMessageBody,
          new_nickname: message.logMessageData.nickname,
          time: getCurrentTimeInVietnam(),
          memory: memory.find({}),
        };

        user_memory.forms.push(form);
      }
      if (message.logMessageType == "log:thread-color") {
        const form = {
          type: "change-color",
          name: user.name,
          user_id: message.author,
          new_color: message.logMessageData.theme_color,
          time: getCurrentTimeInVietnam(),
          memory: memory.find({}),
        };

        user_memory.forms.push(form);
      }
      break;
  }

  if (user_memory.delay) clearTimeout(user_memory.delay);
  user_memory.delay = setTimeout(async () => {
    if (user_memory.process) return;
    try {
      api.sendTypingIndicator(message.threadID);
      if (user_memory.forms.length != 0)
        post_form.unshift(JSON.stringify(user_memory.forms));

      if (post_form.length == 0) return;
      api.global.AI_chat.clear(message.threadID);
      const result = await chat.sendMessage(post_form);

      const response = result.response;

      const commands = JSON.parse(response.text());

      await AI_Process(api, message, commands);

      let history = await chat.getHistory();
      let ms = {
        parts: [
          {
            text: JSON.stringify(commands),
          },
        ],
        role: "model",
      };
      history[history.length - 1] = ms;
      api.global.history = history;
      fs.writeFileSync(
        `./history/${message.threadID}.json`,
        JSON.stringify(history, null, 2)
      );
    } catch (e: any) {
      console.error(e);
      if (e.status == 429) {
        await delay(15 * 1000);
        AI(model, api, message);
        return;
      }
      await delay(10 * 1000);
      AI(model, api, message);
    }
  }, (post_form.length == 0 ? 0 : 20) + 10 * 1000);
}

export const event: Event = {
  name: ["message", "message_reply", "event"],
  async execute(api, event) {
    if (event.isGroup) return;
    const API_KEY = api.env["GEMINI_API_KEY"];

    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig,
      safetySettings,
      systemInstruction,
    });

    if (!api.global.AI_chat) api.global.AI_chat = new Collection<any, any>();

    // api.sendTypingIndicator(message.threadID);
    // if (message.body == "") return;
    // await delay(5 * 1000);
    event.thread = await api.getThreadInfo(event.threadID);
    event.user = await api.getUserInfo(event.threadID);
    await AI(model, api, event);
  },
};
