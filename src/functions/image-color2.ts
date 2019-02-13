const getColors = require('get-image-colors')

export async function getImageColor(data: Buffer, contentType: string): Promise<string> {
    const colors = await getColors(data, contentType);
    return colors[0].hex().replace('#', '');
}
