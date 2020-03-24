require('dotenv').config()

const express = require("express");
const app = express();
app.use(express.static("public"));

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  extended: true
}));

const ejs = require("ejs");
app.set('view engine', 'ejs');

const bcrypt = require('bcrypt');
const saltRounds = 10;


const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
const md5 = require("md5")
// mongoose.connect('mongodb+srv://admin-lu:0629*Salu@cluster0-igwj0.mongodb.net/wikiDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect("mongodb://localhost/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

const Schema = mongoose.Schema;
const UserSchema = new Schema({
    email: String,
    password: String
});

// UserSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedField:["password"]})

const User = mongoose.model("User", UserSchema);


app.get("/", function(req, res){
  res.render("home")
})

app.get("/login", function(req, res){
  res.render("login")
})

app.get("/register", function(req, res){
  res.render("register")
})

app.post("/register", function(req, res) {
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    const newUser = new User({
        email: req.body.email,
        password: hash
    })
    newUser.save(function(err) {
      if (err) {
        console.log(err)
      } else {
        res.render("secrets")
      }
    })
  })
})

app.post("/login", function(req, res){
  User.findOne({email: req.body.email}, function(err, founderUser){
    if (err) {
      console.log(err)
    } else {
      if (founderUser) {
        // Load hash from your password DB.
        bcrypt.compare(req.body.password, founderUser.password, function(err, result) {
          if(result === true) {
            res.render("secrets")
          }
        })
      }
    }
  })
})

app.get("/submit", function(req, res){
  res.render("submit")
})

app.post("/submit", function(req, res){
  const secret = req.body.secret
  console.log(secret)
  res.send("<h1>Thank you for sharing your secrets</h1>")
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
