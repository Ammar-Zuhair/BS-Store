// Optional asset preparation; the final build consumes only committed WebP files.
// Use only approved, public website captures without personal/customer data.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const root = "/workspace/.browser";
await mkdir("public/images/projects", { recursive: true });
for (const [slug, source] of [
  ["nexuspay", "ammar-nexus-reference.png"],
  ["graduation", "ammar-graduate-reference.png"],
]) {
  for (const width of [640, 1280]) {
    await sharp(`${root}/${source}`)
      .resize({ width })
      .webp({ quality: 83 })
      .toFile(`public/images/projects/${slug}-${width}.webp`);
  }
}
