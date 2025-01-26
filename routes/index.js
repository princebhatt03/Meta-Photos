var express = require('express');
var router = express.Router();
const userModel = require('./users');
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');
const cloudinary = require('cloudinary').v2;
const postModel = require('./post');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res, next) {
  res.render('index', { error: req.flash('error') });
});
router.get('/prof', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render('prof', { user });
});

router.get('/feed', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findOne({ username: req.session.passport.user })
      .populate('posts');

    res.render('feed', { user: user, messages: req.flash() });
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while fetching posts');
    res.redirect('/');
  }
});

router.get('/login', function (req, res, next) {
  res.render('login', { error: req.flash('error') });
});

router.get('/about', isLoggedIn, function (req, res, next) {
  res.render('about');
});

router.get('/edit', isLoggedIn, function (req, res, next) {
  res.render('edit');
});

router.get('/upload', isLoggedIn, function (req, res) {
  res.render('upload', {
    messages: req.flash(),
  });
});

router.post('/upload', isLoggedIn, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error', 'No file was uploaded.');
      return res.redirect('/upload'); // Redirect back to the upload page with error message
    }

    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const post = await postModel.create({
      image: req.file.path, // Cloudinary returns the file URL in `file.path`
      user: user._id,
    });

    user.posts.push(post._id);
    await user.save();

    req.flash('success', 'Image uploaded successfully!');
    res.redirect('/feed'); // Redirect to feed with success message
  } catch (err) {
    console.error(err);
    req.flash('error', 'An error occurred while uploading the image.');
    res.redirect('/upload'); // Redirect back to the upload page with error message
  }
});

router.post('/delete/:postId', isLoggedIn, async (req, res) => {
  const { postId } = req.params;

  try {
    // Find the post by ID
    const post = await postModel.findById(postId);

    // Check if the post exists
    if (!post) {
      req.flash('error', 'Post not found!');
      return res.redirect('/feed');
    }

    // Remove the post reference from the user
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.posts.pull(postId); // Pull the post from the user's posts array
    await user.save();

    // Delete the post from the database
    await postModel.findByIdAndDelete(postId); // Use findByIdAndDelete instead of post.remove()

    req.flash('success', 'Post deleted successfully');
    res.redirect('/feed');
  } catch (error) {
    console.error(error);
    req.flash('error', 'An error occurred while deleting the post');
    res.redirect('/feed');
  }
});

// router.post(
//   '/register',
//   passport.authenticate('local', {
//     successRedirect: '/prof',
//     failureRedirect: '/',
//     failureFlash: true,
//   }),
//   function (req, res, next) {
//     const userdata = new userModel({
//       username: req.body.username,
//       name: req.body.name,
//       email: req.body.email,
//     });
//     userModel.register(userdata, req.body.password).then(function () {
//       passport.authenticate('local')(req, res, function () {
//         res.redirect('prof');
//       });
//     });
//   }
// );

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
      res.redirect('/prof');
    });
  });
});

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/prof',
    failureRedirect: '/login',
    failureFlash: true,
  }),
  function (req, res, next) {
    res.render('login');
  }
);
router.get('/logOut', function (req, res, next) {
  req.logOut(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = router;
