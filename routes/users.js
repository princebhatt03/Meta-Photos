const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');
const uri =
  'mongodb+srv://princebhatt316:DnFqDYxei3ai8X3g@cluster0.vdwbeya.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri);

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
