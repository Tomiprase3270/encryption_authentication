//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// use express session 
app.use(session({
    secret: "Our Little Secret",
    resave: false,
    saveUninitialized: false
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

// build mongodb database with mongoose
mongoose.connect("mongodb://localhost:27017/user", { useNewUrlParser: true });
// mongoose.set("useCreateIndex", true);

const newUserSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: [String]
});

newUserSchema.plugin(passportLocalMongoose);
newUserSchema.plugin(findOrCreate);


// mongoose model to save user after encrypted
const User = new mongoose.model("User", newUserSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
        });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


// GOOGLE OAUTH
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect secrets page.
        res.redirect('/secrets');
    });


// render home page
app.get("/", (req, res) => {
    res.render("home");
});


// auth google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));


app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        User.findById(req.user.id, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser.secret !== null) {
                    res.render("secrets", { userWithSecret: foundUser.secret });
                } else {
                    res.render("secrets")
                }
            }
        })
    } else {
        res.render("login");
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {

        User.findById(req.user.id, (err, foundUser) => {
            if (err) {
                console.log(err);
            } else {
                if (foundUser.secret !== null) {
                    res.render("secrets", { userWithSecret: foundUser.secret });
                } else {
                    res.render("secrets")
                }
            }
        })

    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect("/")
    });
});

app.get("/submit", (req, res) => {
    res.render("submit");
});

// POST for register
app.post("/register", (req, res) => {
    User.register({ username: req.body.username }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});


// POST for submit secret
app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                // foundUser.secret = submittedSecret;
                foundUser.secret.push(submittedSecret);
                foundUser.save(function () {
                    res.redirect("/secrets");
                });
            }
        }
    });
});


app.listen(3000, (err) => {
    if (!err) {
        console.log("successfully opened in port 3000");
    } else {
        console.log(err);
    }
});