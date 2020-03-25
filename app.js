require('dotenv').config() //alwasy on top and no need to save as a constant
const express = require("express");
const app = express();
app.use(express.static("public"));

const ejs = require("ejs");
app.set('view engine', 'ejs');

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  extended: true
}));

const mongoose = require('mongoose');

const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require('mongoose-findorcreate')

// first tell app to use session and set up initial confirguration
app.use(session({
  secret: 'This is my little secret.',
  resave: false,
  saveUninitialized: false, //default is true but it's useful to set as false, see documentation
  // cookie: { secure: true }
}))
//tell app to use passport and initialize it
app.use(passport.initialize())
// tell app to use passport to manage session
app.use(passport.session())

// mongoose.connect('mongodb+srv://admin-lu:0629*Salu@cluster0-igwj0.mongodb.net/wikiDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect("mongodb://localhost/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true) //after using new package we get a warning and google search we need this

const Schema = mongoose.Schema;
const userSchema = new Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport.
//First you need to plugin Passport-Local Mongoose into your User schema
//this will hash and salt our passwords and to save our users into out MongoDB database
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema);

//Simplified Passport/Passport-Local Configuration, the createStrategy is responsible to setup passport-local LocalStrategy with the correct options. The reason for this functionality is that when using the usernameField option to specify an alternative usernameField name, for example "email" passport-local would still expect your frontend login form to contain an input field with name "username" instead of email. This can be configured for passport-local but this is double the work. So we got this shortcut implemented.
passport.use(User.createStrategy())
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home")
})

app.get('/auth/google',  //this is the path our button have
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets',  //this is the path we set at google as Authorized redirect URIs
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  }
);

app.get("/login", function(req, res){
  res.render("login")
})

app.get("/register", function(req, res){
  res.render("register")
})

// app.get("/secrets", function(req, res){
//   if (req.isAuthenticated()){
//     res.render("secrets")
//   } else {
//     res.redirect("/login")
//   }
// })

app.get("/secrets", function(req, res){
  // first parameter is a condition to look for all secrets that are not null, ne stands for not equal
  User.find({"secret": {$ne: null}}, function(err, foundUser){
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        //if found all the users that has a secrets, we show the secrets page that list all the secrets ppl submitted
        // <% usersWithSecrets.forEach(function(user){ %>
        // <p class="secret-text"><%=user.secret%></p>
        // <% }) %>
        res.render("secrets", {usersWithSecrets: foundUser})
      }
    }
  })
})


app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit")
  } else {
    res.redirect("/login")
  }
})

app.post("/submit", function(req, res){ //passport automatically save id in req.user
  const submittedSecret = req.body.secret
  // not req.user._id
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret //add new data to existing user
        foundUser.save(function(){
          res.redirect("/secrets")
        })
      }
    }
  })
})

app.get("/logout", function(req, res){
  req.logout()  //get this function from passport documentation
  res.redirect("/")
})

app.post("/register", function(req, res){
  // input name must be username, even if it's email, if we name is email, it will not work
  // User.register is similar like save data into User database
  User.register({username:req.body.username}, req.body.password, function(err, user) {
    if (err) {
      console.log(err)
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets")
      })
    }
  })
})

app.post("/login", function(req, res){
  const user = new  User({
    username: req.body.username,
    password: req.body.password
  })
 // when login, we request(req) user information
 req.login(user, function(err){
   if (err) {
     console.log(err)
   } else { // if no error, passport will authenticate user and then redirect to secreat page
     passport.authenticate("local")(req, res, function(){
     res.redirect("/secrets")
     })
   }
  })
})

//
// app.post("/register", function(req, res) {
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//         email: req.body.email,
//         password: hash
//     })
//     newUser.save(function(err) {
//       if (err) {
//         console.log(err)
//       } else {
//         res.render("secrets")
//       }
//     })
//   })
// })
//
// app.post("/login", function(req, res){
//   User.findOne({email: req.body.email}, function(err, founderUser){
//     if (err) {
//       console.log(err)
//     } else {
//       if (founderUser) {
//         // Load hash from your password DB.
//         bcrypt.compare(req.body.password, founderUser.password, function(err, result) {
//           if(result === true) {
//             res.render("secrets")
//           }
//         })
//       }
//     }
//   })
// })


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
