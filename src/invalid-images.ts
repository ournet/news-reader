const INVALID_IMAGES = [
    // https://s0.rbk.ru/v6_top_pics/media/img/5/87/755434230550875.jpg
    /\.rbk\.ru\//i,
    // https://s3.zona.media/e9f94b3eacd600312caab885a451545a.jpg
    /\.zona\.media\//i,
]

export function isValidImageUrl(url: string) {
    for (const reg of INVALID_IMAGES) {
        if (reg.test(url)) {
            return false;
        }
    }
    return true;
}
