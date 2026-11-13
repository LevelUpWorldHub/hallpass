import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const dist = "extension/dist";

function crc32(buffer: Buffer): number {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size: number): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = x / size;
      const ny = y / size;
      const inTicket = nx > 0.18 && nx < 0.82 && ny > 0.22 && ny < 0.78;
      const stripe = inTicket && ny < 0.34;
      const ink = !inTicket;
      const r = ink ? 27 : stripe ? 226 : 250;
      const g = ink ? 40 : stripe ? 177 : 246;
      const b = ink ? 54 : stripe ? 42 : 238;
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main(): Promise<void> {
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  entryPoints: {
    background: "extension/src/background.ts",
    content: "extension/src/content.ts",
    popup: "extension/src/popup.ts",
  },
  bundle: true,
  format: "iife",
  outdir: dist,
  target: "chrome120",
  platform: "browser",
  legalComments: "none",
  logLevel: "info",
});

await build({
  entryPoints: ["sdk/entry.ts"],
  bundle: true,
  format: "iife",
  globalName: "hallpass",
  outfile: "sdk/hallpass.js",
  target: "es2022",
  platform: "browser",
  legalComments: "none",
});

await build({
  entryPoints: ["sdk/entry.ts"],
  bundle: true,
  format: "esm",
  outfile: "sdk/hallpass.mjs",
  target: "es2022",
  platform: "neutral",
  legalComments: "none",
});

await copyFile("extension/manifest.json", `${dist}/manifest.json`);
await copyFile("extension/popup.html", `${dist}/popup.html`);
const { writeFile } = await import("node:fs/promises");
for (const size of [16, 32, 48, 128]) {
  await writeFile(`${dist}/icon${size}.png`, png(size));
}
}

void main();
