import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');

class AuthController {
  static async getConnect(req, res) {
    const [email, password] = Buffer.from(req.header('Authorization').split(' ')[1], 'base64').toString('utf-8').split(':');
    const user = await dbClient.users.findOne({ email });
    if (!user || user.password !== sha1(password)) return res.status(401).send({ error: 'Unauthorized' });
    const token = uuidv4();
    const key = `auth_${token}`;
    redisClient.set(key, user._id.toString(), 60 * 60 * 24);
    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (userId) {
      await redisClient.del(`auth_${token}`);
      return res.status(204).send();
    }
    return res.status(401).send({ error: 'Unauthorized' });
  }
}

module.exports = AuthController;
