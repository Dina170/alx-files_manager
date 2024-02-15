import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    if (!name) return res.status(400).send({ error: 'Missing name' });

    if ((!type || !['folder', 'file', 'image'].includes(type))) return res.status(400).send({ error: 'Missing type' });

    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    if (parentId) {
      const parent = await dbClient.files.findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });

      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }
    const fileData = {
      userId: user._id,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
    };

    if (type === 'folder') {
      const createdFolder = await dbClient.files.insertOne(fileData);
      fileData.id = createdFolder.insertedId;
      delete fileData._id;
      return res.status(201).send(fileData);
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const filePath = `${folderPath}/${fileName}`;
    fileData.localPath = filePath;
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const decodedData = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, decodedData);
    const createdFile = await dbClient.files.insertOne(fileData);
    return res.status(201).send({
      id: createdFile.insertedId,
      userId: fileData.userId,
      name: fileData.name,
      type: fileData.type,
      isPublic: fileData.isPublic,
      parentId: fileData.parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const file = await dbClient.files.findOne({ _id: ObjectId(req.params.id), userId: ObjectId(userId) });
    if (!file) return res.status(404).send({ error: 'Not found' });
    return res.send({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    const folder = await dbClient.files.aggregate([
      {
        $match: {
          parentId: req.query.parentId || 0,
        },
      },
      { $skip: req.query.page * 20 || 0 },
      { $limit: 20 },
    ]).toArray();
    const formatedResponse = [];
    folder.forEach((ele) => {
      formatedResponse.push({
        id: ele._id,
        userId: ele.userId,
        name: ele.name,
        type: ele.type,
        isPublic: ele.isPublic,
        parentId: ele.parentId,
      });
    });
    return res.send(formatedResponse);
  }
}

module.exports = FilesController;
