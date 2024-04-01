import { doneAnimation, loadingAnimation } from "./core/module/console.ts";

import { fork } from 'node:child_process';

import path from 'node:path';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import process from "node:process";

const _1_MINUTE = 60000;
let restartCount = 0;
let startTime = 0;

let runtime = "unknown";

if (process.env.NODE) {
  runtime = "node";
} else if (Deno.version) {
  runtime = "deno"
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

	if (runtime === "node") {
		const child = fork("./src/core/index.ts", [], { stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'ipc'] });

		child.on('close', async (code) => {
			if(!code) return
			handleRestartCount();
			if (code !== 0 && restartCount < 5) {
				console.log();
				console.error(`Đã có lỗi :(, mã lỗi là: ${code}`);
				console.info('Khởi động lại...');
				await new Promise(resolve => setTimeout(resolve, 2000));
				main();
			}
			else {
				console.log();
				console.log('Bot đã dừng, ấn Ctrl + C để thoát.');
			}
		});

		child.on('message', (message) => {
			if(message == 'restart') {
				console.info('Nhận yêu cầu khởi động lại...');
				child.kill();
				setTimeout(() => main(), 5 * 1000)
			}
			if(message == 'stop') {
				child.kill();
			}
		})
	} else if (runtime === "deno") {
		const p = Deno.run({
			cmd: ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-sys", "./src/core/index.ts"],
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
}

function handleRestartCount() {
	restartCount++;
	setTimeout(() => {
		restartCount--;
	}, _1_MINUTE);
}

main();