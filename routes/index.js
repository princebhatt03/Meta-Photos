var express = require('express');
var router = express.Router();
const userModel = require('./users');
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');
const postModel = require('./post');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res, next) {
  res.render('index', { error: req.flash('error') });
});

// Profile route
router.get('/prof', isLoggedIn, async function (req, res, next) {
  const success = req.flash('success');
  const error = req.flash('error');
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render('prof', { user, success, error });
});

// Feed route
router.get('/feed', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findOne({ username: req.session.passport.user })
      .populate('posts');

    const posts = user.posts.map(post => {
      return {
        imageUrl: post.image,
        isVideo:
          post.image &&
          (post.image.endsWith('.mp4') ||
            post.image.endsWith('.mov') ||
            post.image.endsWith('.webm')),
      };
    });

    res.render('feed', { user: user, posts: posts, messages: req.flash() });
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while fetching posts');
    res.redirect('/');
  }
});

// Login route
router.get('/login', function (req, res, next) {
  res.render('login', { error: req.flash('error') });
});

// About route
router.get('/about', isLoggedIn, function (req, res, next) {
  res.render('about');
});

// Edit Profile route
router.get('/edit', isLoggedIn, (req, res) => {
  const success = req.flash('success');
  const error = req.flash('error');
  const { username } = req.session.user; // ensure session contains user object
  res.render('edit', { success, error, user: username });
});

// Profile update post route
router.post('/prof', isLoggedIn, async (req, res) => {
  try {
    const { username, currentPassword, newPassword, confirmPassword } =
      req.body;
    const user = await userModel.findById(req.session.user._id);

    if (!user) throw new Error('User not found');
    if (currentPassword && user.password !== currentPassword) {
      throw new Error('Incorrect current password');
    }

    if (newPassword && newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (username) user.username = username;
    if (newPassword) user.password = newPassword;
    await user.save();

    req.session.user.username = username; // Update session
    req.flash('success', 'Profile updated successfully');
    res.redirect('/prof');
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/prof');
  }
});

// Image upload route
router.get('/upload', isLoggedIn, function (req, res) {
  res.render('upload', {
    messages: req.flash(),
  });
});

// Update the upload route to handle multiple files
router.post(
  '/upload',
  isLoggedIn,
  upload.array('files', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        req.flash('error', 'No files were uploaded.');
        return res.redirect('/upload');
      }

      const user = await userModel.findOne({
        username: req.session.passport.user,
      });

      // Create posts for each uploaded file
      const posts = await Promise.all(
        req.files.map(async file => {
          return await postModel.create({
            image: file.path,
            user: user._id,
          });
        })
      );

      // Add all post IDs to the user's posts array
      const postIds = posts.map(post => post._id);
      user.posts.push(...postIds);
      await user.save();

      req.flash('success', 'Posts uploaded successfully!');
      res.redirect('/feed');
    } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred while uploading the files.');
      res.redirect('/upload');
    }
  }
);

// Delete post route
router.post('/delete/:postId', isLoggedIn, async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/feed');
    }

    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.posts.pull(postId);
    await user.save();

    await postModel.findByIdAndDelete(postId);

    req.flash('success', 'Post deleted successfully');
    res.redirect('/feed');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while deleting the post');
    res.redirect('/feed');
  }
});

// Register route
router.post('/register', function (req, res, next) {
  const userdata = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });

  userModel.register(userdata, req.body.password, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/register');
    }
    passport.authenticate('local')(req, res, function () {
      res.redirect('/feed');
    });
  });
});

// Login post route
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/feed',
    failureRedirect: '/login',
    failureFlash: true,
  }),
  function (req, res, next) {
    res.render('login');
  }
);

// Logout route
router.get('/logOut', function (req, res, next) {
  req.logOut(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

// Middleware for checking if the user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;
