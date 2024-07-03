const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/MetaPhotos');

const userSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  profileImage: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'post' }],
});

userSchema.plugin(plm);
module.exports = mongoose.model('user', userSchema);
