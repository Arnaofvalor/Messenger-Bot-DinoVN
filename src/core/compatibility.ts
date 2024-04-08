import { fork } from "node:child_process";

let restartCount = 0;

function handleRestartCount() {
  restartCount++;
  setTimeout(() => {
    restartCount--;
  }, 1 * 60 * 1000);
}

function runWithNode(main: () => void) {
  const child = fork("./src/core/index.ts", [], {
    stdio: ["inherit", "inherit", "inherit", "pipe", "ipc"],
  });

  child.on("close", async (code) => {
    if (!code) return;
    handleRestartCount();
    if (code !== 0 && restartCount < 5) {
      console.log();
      console.error(`Đã có lỗi :(, mã lỗi là: ${code}`);
      console.info("Khởi động lại...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      main();
    } else {
      console.log();
      console.log("Bot đã dừng, ấn Ctrl + C để thoát.");
    }
  });

  child.on("message", (message) => {
    if (message == "restart") {
      console.info("Nhận yêu cầu khởi động lại...");
      child.kill();
      setTimeout(() => main(), 5 * 1000);
    }
    if (message == "stop") {
      child.kill();
    }
  });
}

function runWithDeno(main: () => void) {
  const p = Deno.run({
    cmd: ["deno", "run", "--allow-all", "./src/core/index.ts"],
    stdout: "piped",
    stderr: "piped",
  });

  p.status().then(async (status) => {
    if (status.code !== 0 && restartCount < 5) {
      console.log();
      console.error(`Đã có lỗi :(, mã lỗi là: ${status.code}`);
      console.info('Khởi động lại...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      main();
    }
    else {
      console.log();
      console.log('Bot đã dừng, ấn Ctrl + C để thoát.');
    }
  });

  Deno.copy(p.stdout, Deno.stdout);
  Deno.copy(p.stderr, Deno.stderr);
}

function runWithBun(main: () => void) {
  const child = Bun.spawn(["bun", "./src/core/index.ts"], {
    ipc(message) {
      
    },
  });
}

export {
  runWithNode,
  runWithDeno,
  runWithBun,
}