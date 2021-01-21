import dhash from "./dhash-image";

export async function getImageHash(data: Buffer): Promise<string> {
  const hash = await dhash(data, 8);
  return hash.toString("hex");
}
