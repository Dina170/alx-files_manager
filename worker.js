import dbClient from './utils/db';

const Queue = require('bull');

const ObjectId = require('mongodb').ObjectID;
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');

const fileQueue = new Queue('image transcoding');

async function createThumbnail(filePath, options) {
  try {
    const thumbnail = await imageThumbnail(filePath, options);
    const thumbnailPath = `${filePath}_${options.width}`;
    await fs.writeFileSync(thumbnailPath, thumbnail);
  } catch (err) {
    console.error(err);
  }
}

fileQueue.process(async (job) => {
  const { fileId } = job.data;
  if (!fileId) throw new Error('Missing fileId');

  const { userId } = job.data;
  if (!userId) throw new Error('Missing userId');

  const file = await dbClient.files.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });
  if (!file) throw new Error('File not found');

  createThumbnail(file.localPath, { width: 500 });
  createThumbnail(file.localPath, { width: 250 });
  createThumbnail(file.localPath, { width: 100 });
});
