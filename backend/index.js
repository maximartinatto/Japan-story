require("dotenv").config();
const config = require("./config.json");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors")
const jwt = require("jsonwebtoken");

const { authenticateToken } = require("./utilities");

const User = require("./models/user.model");
const JapanStory = require("./models/japanStory.model")



mongoose.connect(config.connectionString);


const app = express();
app.use(express.json());
app.use(cors({ origin: "*"}));

// Create Account
app.post("/create-account", async (req, res ) => {
    const { fullName, email, password } = req.body;

    if(!fullName || !email || !password) {
        return res
            .status(400)
            .json({ error: true, message: "All fields are required"})
    }

    const isUser = await User.findOne({ email });

    if(isUser) {
        return res
            .status(400)
            .json({ error: true, message: "User already exists"})
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
        fullName,
        email,
        password: hashedPassword
    });

    await user.save();

    const accessToken = jwt.sign(
        { userId: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "72h",
        }
    );

    return res.status(200).json({
        error: false,
        user: { fullName: user.fullName, email: user.email },
        accessToken,
        message: "Registration Successfully"
    });
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if(!email || !password) {
        return res.status(400).json({ message: "Email and Password are required"});
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid){
        return res.status(400).json({ message: "Invalid Credentials" });
    }

    const accessToken = jwt.sign(
        { userId: user._id},
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "72h"
        }
    );

    return res.json({
        error: false,
        message: "Login Successfully",
        user: { fullName: user.fullName, email: user.email },
        accessToken
    });
})

// Get user
app.get("/get-user", authenticateToken, async (req, res) => {
    const { userId } = req.user

    const isUser = await User.findOne({ _id: userId });

    if (!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: isUser,
        message: ""
    });
})

// Add japan story

app.post("/add-japan-story", authenticateToken, async (req, res) => {
    const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
    const { userId } = req.user

    // validate required fields
    if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
        return res.status(400).json({ error: true, message: "All fields are required" });
    }

    // Convert visitedDate from milliseconds to Date object
    const parsedVisitedDate = new Date(parseInt(visitedDate));

    try {
        const japanStory = new JapanStory({
            title,
            story,
            visitedLocation,
            userId,
            imageUrl,
            visitedDate: parsedVisitedDate
        });

        await japanStory.save();
        res.status(200).json({ story: japanStory, message: "Added Successfully" });
    } catch (error) {
        res.status(400).json({ error: true, message: error.message });
    }
})


app.listen(3001);
module.exports = app;
