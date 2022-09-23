//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const saltRounds = 10;
// const md5 = require("md5");
// const encrypt = require('mongoose-encryption');

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));



// build mongodb database with mongoose
mongoose.connect("mongodb://localhost:27017/user", { useNewUrlParser: true });

const newUserSchema = new mongoose.Schema({
    username: String,
    password: String
});


// // encrypt paswword using mongoose-encryption
// newUserSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] })


// mongoose model to save user after encrypted
const User = mongoose.model("User", newUserSchema);


// render home page
app.get("/", (req, res) => {
    res.render("home");
});


app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});


// POST for register
app.post("/register", (req, res) => {

    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        username = req.body.username;
        password = hash;

        const newUser = new User({
            username: username,
            password: password
        });

        newUser.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });
});



// POST for login
app.post("/login", (req, res) => {
    username = req.body.username;
    password = req.body.password;

    User.findOne({ username: username }, (err, foundUser) => {

        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    if (result === true) {
                        res.render("secrets")
                    } else {
                        console.log(err);
                    }
                });
            }
        };
    });
});

app.listen(3000, (err) => {
    if (!err) {
        console.log("successfully opened in port 3000");
    } else {
        console.log(err);
    }
});