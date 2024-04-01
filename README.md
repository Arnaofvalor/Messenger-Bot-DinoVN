# Messenger Bot
## Bot có thể chạy trên NodeJS >= 20 hoặc Deno >= 1.42.1
## Code này chỉ có 1 người code nên có gì hãy pull request fix giúp mình nhé
- [Cách Tải](#cách-tải)
- [Setup env](#setup-env)
- [Chỉnh config của bot](#chỉnh-config-của-bot)
- [Cách sử dụng](#cách-sử-dụng)
- [Cài đặt các package (NodeJS)](#cài-đặt-các-package) (Nếu bạn dùng Deno thì bỏ qua)
- [Cách chạy trên NodeJS](#chạy-bot-nodejs)
- [Cách chạy trên Deno](#chạy-bot-deno)
- [Update logs](#update-log)
---
### Cách Tải
**Tải bằng git**
```
git clone https://github.com/Dino-VN/Messenger-Bot-DinoVN.git
```
### Cài đặt các package
Nếu bạn dùng Deno thì bỏ qua
```
# Dùng npm
npm install
# Dùng yarn
yarn install
# Dùng pnpm
pnpm install
```
### Setup env 
Vào [đây](https://www.mongodb.com/) để tạo tài khoản mongodb\
Tạo file `.env` và chèn các dòng sau:
```
MONGO_URI=mongodb+srv://... 
```
Thay `mongodb+srv://...` bằng địa chỉ của tài khoản mongodb của bạn\
### Chỉnh config của bot
Vào file `bot.config.js` và chỉnh sửa theo ý muốn\
File `bot.config.js` mặc định:
```js
// !! Những thứ quan trong như MONGO_URI vẫn sẽ ở trong .env !!

export default {
// ------ Admin Config ------
  OWNER_ID: "100016495471276",
  // Cho phép owner dùng lệnh admin mà không cần là admin của nhóm
  ADMIN_BYPASS: false,
  // Cho phép owner dùng lệnh admin mà không cần là bot là admin của nhóm
  BOT_ADMIN_BYPASS: false,
// ------ Bot Config------
  PERFIX: "!",
  TIMEZONE: "Asia/Ho_Chi_Minh",
// ------ Update ------
  UPDATE: true,
  AUTO_UPDATE: false,
// ------ Module ------
  // Tự động ban những người cố tình phá bot lấy từ api của Dino Bot (Đồng bộ ban với bot Dino Bot)
  GLOBAL_BAN: true,
  DAILY_CHAT: false,
// ------ Uptime ------
  UPTIME: false,
  // Nếu dùng như kiểu replit thì không cần set PORT
  // PORT: 3000,
}
```
### Cách sử dụng
 - 📁src/commands - nơi chứa lệnh
    - Xem file lệnh ví dụ tại [đây](https://github.com/Dino-VN/Messenger-Bot-DinoVN/blob/Core/src/commands/ping.ts) lệnh ping khi dùng lệnh `!ping` bot sẽ trả lời lại pong
 - 📁src/events - nơi chứa các event
    - Xem file lệnh ví dụ tại [đây](https://github.com/Dino-VN/Messenger-Bot-DinoVN/blob/Core/src/events/LogAllMessage.ts.example) event đó sẽ log tất cả tin nhắn bot nhìn thấy
 - 📁src/functions - nơi chứa functions tất cả file trong này sẽ được chạy khi bot khởi động
### Chạy bot (NodeJS)
Chạy bot bằng package manager
```sh
# Dùng npm
npm start
# Dùng yarn
yarn start
```
Hoặc chạy bằng lệnh node
```sh
node index.js
```
### Chạy bot (Deno)
Chạy lệnh không cần đồng ý quyền
```sh
deno run --allow-all src/index.ts
```
Hoặc chạy đồng ý từng quyền 1
```sh
deno run src/index.ts
```
---
### Update log
**23/2/2014 - 15:20**
```ts
// Thêm
api.on(string[], callback: (event))
api.remove(string)
// Ví dụ sử dụng
api.sendMessage(`pong, ${ping} ms`, event.threadID, (e, m) => {
  let id = api.on(["message_reply"], (event) => {
    if(event.messageReply!.messageID == m.messageID) {
      api.sendMessage(event.body, event.threadID);
    }
  })
  setTimeout(() => {
    api.sendMessage("Xóa event", event.threadID);
    api.remove(id)
  }, 30000);
},event.messageID);
```
**1/4/2024 - 20:30**
Thêm hỗ trợ cho Deno 1.42.1
**23/2/2024 - 13:00**
```ts
// Thêm
api.getRecommendedFriends(callback?: (error, data?))
api.sendFrendRequest: (string | string[], callback?: (error, data));
```
**22/2/2024**
```ts
// Thêm
api.sendCommemt(string | {
  body: string,
  attachment: fs.ReadStream
}, postId: string, callback?: (error, data))
```