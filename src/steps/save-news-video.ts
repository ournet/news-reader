
const debug = require('debug')('ournet:news-reader');
import { Video, VideoRepository, VideoHelper } from "@ournet/videos-domain";

export async function saveNewsVideo(videoRep: VideoRepository, video: Video) {

    const id = video.id;
    const source = video.websites[0];

    const existingImage = await videoRep.getById(id);

    if (existingImage) {
        if (existingImage.websites.includes(source)) {
            debug(`The video already used the source: ${source}`);
            return;
        }

        return videoRep.update({
            id,
            set: {
                websites: existingImage.websites.concat(video.websites),
                expiresAt: VideoHelper.expiresAt(new Date()),
            }
        });
    }

    return videoRep.create(video);
}
