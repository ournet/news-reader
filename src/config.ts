
export const S3_IMAGES_BUCKET = process.env.S3_IMAGES_BUCKET || '';

if (!S3_IMAGES_BUCKET) {
    throw new Error('S3_IMAGES_BUCKET is required!');
}


