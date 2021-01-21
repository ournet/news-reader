import assert from "assert";
import sharp from "sharp";

const DEFAULT_HASH_SIZE = 8;

sharp.cache(false);

export default async function (path: string | Buffer, hashSize?: number) {
  const height = hashSize || DEFAULT_HASH_SIZE;
  const width = height + 1;

  // Covert to small gray image
  const pixels = await sharp(path)
    .grayscale()
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer();

  let difference = "";
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < height; col++) {
      // height is not a mistake here...
      const left = px(pixels, width, col, row);
      const right = px(pixels, width, col + 1, row);
      difference += left < right ? 1 : 0;
    }
  }
  return binaryToHex(difference);
}

// TODO: move to a separate module
function binaryToHex(s: string) {
  var output = "";
  for (var i = 0; i < s.length; i += 4) {
    var bytes = s.substr(i, 4);
    var decimal = parseInt(bytes, 2);
    var hex = decimal.toString(16);
    output += hex;
  }
  return Buffer.from(output, "hex");
}

function px(pixels: string | Buffer, width: number, x: number, y: number) {
  var pixel = width * y + x;
  assert(pixel < pixels.length);
  return pixels[pixel];
}
