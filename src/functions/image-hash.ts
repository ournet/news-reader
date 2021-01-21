import dhash from "./dhash-image";

export async function getImageHash(data: Buffer): Promise<string> {
  const hash = await dhash(data);
  return hash.toString("hex");
}
