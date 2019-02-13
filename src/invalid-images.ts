const INVALID_IMAGES = [
    // https://s0.rbk.ru/v6_top_pics/media/img/5/87/755434230550875.jpg
    /\.rbk\.ru\//i,
    // https://s3.zona.media/e9f94b3eacd600312caab885a451545a.jpg
    /\.zona\.media\//i,
    // img.championat.com
    /img\.championat\.com/i,
    // https://static.novayagazeta.ru/storage/news_entry/149209/picture-b4ee594ca58c4f0091d681cf87def57c.png
    // https://static.novayagazeta.ru/storage/post/77767/regular_social_image-d1178b4ff861887665ce3bcf261d8bd8.jpg
    /static\.novayagazeta\.ru\/storage\/news_entry/i,
]

export function isValidImageUrl(url: string) {
    for (const reg of INVALID_IMAGES) {
        if (reg.test(url)) {
            return false;
        }
    }
    return true;
}
