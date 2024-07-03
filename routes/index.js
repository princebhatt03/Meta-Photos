var express = require('express');
var router = express.Router();
const userModel = require('./users');
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');
const postModel = require('./post');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function (req, res, next) {
  res.render('index');
});
router.get('/prof', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  res.render('prof', { user });
});
router.get('/feed', isLoggedIn, async function (req, res, next) {
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate('posts');
  res.render('feed', { user });
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
  res.render('upload');
});
router.post('/upload', isLoggedIn, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(404).send('No Files were given');
  }
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    image: req.file.filename,
    user: user._id,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect('feed');
});

router.post('/register', function (req, res, next) {
  const userdata = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });
  userModel.register(userdata, req.body.password).then(function () {
    passport.authenticate('local')(req, res, function () {
      res.redirect('prof');
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
