const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

mongoose
  .connect(uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, 'Please fill a valid email address'],
  },
  password: String,
  profileImage: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'post' }],
});

userSchema.plugin(plm);

module.exports = mongoose.model('user', userSchema);
