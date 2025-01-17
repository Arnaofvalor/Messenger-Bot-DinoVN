import process from "node:process";

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

if (runtime === "unknown") {
  console.error("Unknown runtime");
  if (process.send) process.send("stop");
  process.exit(1);
}

const colors = {
  reset: "\x1B[0m",
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m",
  brightBlack: "\x1B[90m",
  brightRed: "\x1B[91m",
  brightGreen: "\x1B[92m",
  brightYellow: "\x1B[93m",
  brightBlue: "\x1B[94m",
  brightMagenta: "\x1B[95m",
  brightCyan: "\x1B[96m",
  brightWhite: "\x1B[97m",
};

function loadingAnimation(
  text = "",
  chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"],
  delay = 100
) {
  let x = 0;

  return setInterval(function () {
    if (runtime === "deno") {
      const str = new TextEncoder().encode(`\r${colors.gray}[${colors.green}` + chars[x++] + `${colors.gray}]${colors.reset} ` + text)
      Deno.stdout.writeSync(str);
    } else if (runtime === "node") {
      process.stdout.write(`\r${colors.gray}[${colors.green}` + chars[x++] + `${colors.gray}]${colors.reset} ` + text);
    }
    x = x % chars.length;
  }, delay);
}

function doneAnimation(
  text = "",
  loadingAnimation: any
) {
  clearInterval(loadingAnimation);
  if (runtime === "deno") {
    const str = new TextEncoder().encode("\r" + `${colors.gray}[${colors.green}✓${colors.gray}]${colors.reset} ` + text + "\n");
    Deno.stdout.writeSync(str);
  } else if (runtime === "node") {
    process.stdout.write("\r" + `${colors.gray}[${colors.green}✓${colors.gray}]${colors.reset} ` + text + "\n");
  }
}

function errAnimation(
  text = "",
  loadingAnimation: any
) {
  clearInterval(loadingAnimation);
  if (runtime === "deno") {
    const str = new TextEncoder().encode("\r" + `${colors.gray}[${colors.green}X${colors.gray}]${colors.reset} ` + text + "\n");
    Deno.stdout.writeSync(str);
  } else if (runtime === "node") {
    process.stdout.write("\r" + `${colors.gray}[${colors.green}X${colors.gray}]${colors.reset} ` + text + "\n");
  }
}

console.info = (message: any, ...optionalParams: any[]) => {
  console.log(`${colors.gray}[${colors.green}INFO${colors.gray}]${colors.reset}`, message, ...optionalParams);
}

console.error = (...data: any[]) => {
  console.log(`${colors.gray}[${colors.red}ERROR${colors.gray}]${colors.reset}`, ...data);
}

console.warn = (...data: any[]) => {
  console.log(`${colors.gray}[${colors.yellow}WARN${colors.gray}]${colors.reset}`, ...data);
}

export {
  loadingAnimation,
  doneAnimation,
  errAnimation,
}