import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type IconSpec = {
  idiom: string;
  size: string;
  scale: string;
  filename: string;
  actualSize: number;
};

const IOS_ICONS: IconSpec[] = [
  { idiom: "iphone", size: "20x20", scale: "2x", filename: "icon-20@2x.png", actualSize: 40 },
  { idiom: "iphone", size: "20x20", scale: "3x", filename: "icon-20@3x.png", actualSize: 60 },
  { idiom: "iphone", size: "29x29", scale: "2x", filename: "icon-29@2x.png", actualSize: 58 },
  { idiom: "iphone", size: "29x29", scale: "3x", filename: "icon-29@3x.png", actualSize: 87 },
  { idiom: "iphone", size: "40x40", scale: "2x", filename: "icon-40@2x.png", actualSize: 80 },
  { idiom: "iphone", size: "40x40", scale: "3x", filename: "icon-40@3x.png", actualSize: 120 },
  { idiom: "iphone", size: "60x60", scale: "2x", filename: "icon-60@2x.png", actualSize: 120 },
  { idiom: "iphone", size: "60x60", scale: "3x", filename: "icon-60@3x.png", actualSize: 180 },
  { idiom: "ipad", size: "20x20", scale: "1x", filename: "icon-20@1x.png", actualSize: 20 },
  { idiom: "ipad", size: "20x20", scale: "2x", filename: "icon-20@2x-ipad.png", actualSize: 40 },
  { idiom: "ipad", size: "29x29", scale: "1x", filename: "icon-29@1x.png", actualSize: 29 },
  { idiom: "ipad", size: "29x29", scale: "2x", filename: "icon-29@2x-ipad.png", actualSize: 58 },
  { idiom: "ipad", size: "40x40", scale: "1x", filename: "icon-40@1x.png", actualSize: 40 },
  { idiom: "ipad", size: "40x40", scale: "2x", filename: "icon-40@2x-ipad.png", actualSize: 80 },
  { idiom: "ipad", size: "76x76", scale: "1x", filename: "icon-76@1x.png", actualSize: 76 },
  { idiom: "ipad", size: "76x76", scale: "2x", filename: "icon-76@2x.png", actualSize: 152 },
  { idiom: "ipad", size: "83.5x83.5", scale: "2x", filename: "icon-83.5@2x.png", actualSize: 167 },
  { idiom: "ios-marketing", size: "1024x1024", scale: "1x", filename: "icon-1024.png", actualSize: 1024 },
];

const ANDROID_SIZES: Array<{ folder: string; size: number }> = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
];

type ParsedArgs = {
  input: string;
  output: string;
  padding: number;
  allowLowRes: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      values.set(key, value);
      i += 1;
    } else {
      values.set(key, "true");
    }
  }

  const input = values.get("input") ?? "./assets/icon-1024.png";
  const output = values.get("output") ?? "./mobile-icons";
  const paddingRaw = values.get("padding") ?? "0.1";
  const allowLowRes = values.get("allow-low-res") === "true";
  const padding = Number(paddingRaw);

  if (!Number.isFinite(padding) || padding < 0 || padding >= 0.5) {
    throw new Error("--padding must be a number between 0 and < 0.5 (example: 0.1)");
  }

  return { input, output, padding, allowLowRes };
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function createPaddedSquare(inputPath: string, canvasSize: number, paddingRatio: number): Promise<Buffer> {
  const image = sharp(inputPath, { failOn: "none" }).rotate();
  const innerSize = Math.max(1, Math.floor(canvasSize * (1 - 2 * paddingRatio)));

  return image
    .resize(innerSize, innerSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: Math.floor((canvasSize - innerSize) / 2),
      bottom: Math.ceil((canvasSize - innerSize) / 2),
      left: Math.floor((canvasSize - innerSize) / 2),
      right: Math.ceil((canvasSize - innerSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(canvasSize, canvasSize, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .sharpen(0.8)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function writeIOSIcons(baseBuffer: Buffer, outputRoot: string): Promise<void> {
  const appIconSetDir = path.join(outputRoot, "ios", "AppIcon.appiconset");
  await ensureDir(appIconSetDir);

  for (const icon of IOS_ICONS) {
    const filePath = path.join(appIconSetDir, icon.filename);
    await sharp(baseBuffer)
      .resize(icon.actualSize, icon.actualSize, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(filePath);
  }

  const contents = {
    images: IOS_ICONS.map((icon) => ({
      idiom: icon.idiom,
      size: icon.size,
      scale: icon.scale,
      filename: icon.filename,
    })),
    info: {
      version: 1,
      author: "xcode",
    },
  };

  await fs.writeFile(path.join(appIconSetDir, "Contents.json"), JSON.stringify(contents, null, 2), "utf8");
}

async function writeAndroidIcons(baseBuffer: Buffer, outputRoot: string): Promise<void> {
  const androidRoot = path.join(outputRoot, "android");

  for (const icon of ANDROID_SIZES) {
    const folder = path.join(androidRoot, icon.folder);
    await ensureDir(folder);

    await sharp(baseBuffer)
      .resize(icon.size, icon.size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(folder, "ic_launcher.png"));

    await sharp(baseBuffer)
      .resize(icon.size, icon.size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(folder, "ic_launcher_round.png"));
  }

  await ensureDir(path.join(androidRoot, "play-store"));
  await sharp(baseBuffer)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(androidRoot, "play-store", "icon-512.png"));

  await sharp(baseBuffer)
    .resize(1024, 500, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(androidRoot, "play-store", "feature-graphic-1024x500.png"));
}

async function validateSource(inputPath: string, allowLowRes: boolean): Promise<void> {
  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read source image dimensions: ${inputPath}`);
  }

  if (metadata.width !== metadata.height) {
    throw new Error(`Source image must be square. Received ${metadata.width}x${metadata.height}`);
  }

  if (metadata.width < 1024 || metadata.height < 1024) {
    if (!allowLowRes) {
      throw new Error(
        `Source image must be at least 1024x1024. Received ${metadata.width}x${metadata.height}. ` +
        "Use --allow-low-res true only when you accept potential quality loss.",
      );
    }
    console.warn(
      `[icon-generator] Warning: low-resolution source (${metadata.width}x${metadata.height}); ` +
      "icons are generated but quality may be reduced.",
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);

  await validateSource(inputPath, args.allowLowRes);
  await ensureDir(outputPath);

  const paddedBase = await createPaddedSquare(inputPath, 1024, args.padding);

  await writeIOSIcons(paddedBase, outputPath);
  await writeAndroidIcons(paddedBase, outputPath);

  console.log("Generated iOS and Android icons successfully.");
  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Safe padding: ${(args.padding * 100).toFixed(1)}%`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown icon generation error.";
  console.error(`[icon-generator] ${message}`);
  process.exit(1);
});
