import sharp from "sharp";

const getRgbaPalette = require("get-rgba-palette");

/**
 * Dominant colour of an image.
 *
 * Same median-cut palette as before (`get-rgba-palette`), but the pixels come
 * out of libvips instead of `get-image-colors`/`get-pixels`. That drops a
 * second, pure-JavaScript decode of every image off the main thread: ~29ms and
 * a full-frame RGBA allocation on the JS heap per image, versus ~7ms here.
 *
 * sharp also decodes webp directly, so the old webp -> png round trip is gone.
 *
 * Note the values differ from the previous implementation by about 1/255 per
 * channel on some images: libjpeg-turbo and jpeg-js round the IDCT differently.
 * The colour is part of the image id, so ids shift once for affected images.
 */
export async function getImageColor(data: Buffer): Promise<string> {
  const raw = await sharp(data).ensureAlpha().raw().toBuffer();

  const palette: number[][] = getRgbaPalette(raw, 5);

  if (!palette || !palette.length) {
    throw new Error("Could not extract a colour palette from the image");
  }

  return toHex(palette[0]);
}

function toHex(rgba: number[]) {
  return rgba
    .slice(0, 3)
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
}
