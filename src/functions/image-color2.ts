import sharp from "sharp";
const getColors = require("get-image-colors");

export async function getImageColor(
  data: Buffer,
  contentType: string
): Promise<string> {
  if (contentType.endsWith("webp")) {
    data = await sharp(data).toFormat("png").toBuffer();
    contentType = "image/png";
  }
  const colors = await getColors(data, contentType);
  return colors[0].hex().replace("#", "");
}
