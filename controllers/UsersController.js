import dbClient from '../utils/db';

const sha1 = require('sha1');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });
    const emailFound = await dbClient.users.findOne({ email });
    if (emailFound) return res.status(400).send({ error: 'Already exist' });
    const hashedPass = sha1(password);
    const createdUser = await dbClient.users.insertOne({ email, password: hashedPass });
    return res.status(201).send({ id: createdUser.insertedId, email, });
  }
}

module.exports = UsersController;
