import { doneAnimation, loadingAnimation } from "./core/module/console.ts";

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import process from "node:process";
import { runWithBun, runWithDeno, runWithNode } from "./core/compatibility.ts";


let runtime = "unknown";

if (process.env.NODE) {
  runtime = "node";
} else {
  try {
    if (Deno) {
      runtime = "deno";
    }
  } catch (e) {}
}

if (runtime === "unknown") {
  console.error("Unknown runtime");
  if (process && process.send) process.send("stop");
  process.exit(1);
}

function main() {
	if(!existsSync('./.temp')) {
		console.info('Không tìm thấy thư mục .temp đang tạo thư mục')
		let loading = loadingAnimation('Đang tạo thư mục .temp')
		mkdirSync('./.temp')
		doneAnimation("Đang tạo thư mục .temp", loading)
	}
	if(!existsSync('./log')) {
		console.info('Không tìm thấy thư mục log đang tạo thư mục')
		let loading = loadingAnimation('Đang tạo thư mục log')
		mkdirSync('./log')
		doneAnimation("Đang tạo thư mục log", loading)
	}

	let loading = loadingAnimation('Đang dọn dẹp thư mục .temp')
	const tempFiles = readdirSync('./.temp')
	for (const file of tempFiles) {
		unlinkSync('./.temp/' + file)
	}
	doneAnimation('Đang dọn dẹp thư mục .temp', loading)

	if (runtime === "node") runWithNode(main);
	else if (runtime === "deno") runWithDeno(main);
	else if (runtime === "bun") runWithBun(main);
}

main();