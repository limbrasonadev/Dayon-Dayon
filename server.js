const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

// CORS setup
app.use(cors({
  origin: ["http://localhost:3000"] // add production URL later
}));

// Serve static files 
app.use(express.static(path.join(__dirname, "public")));

// Encouragement messages
const encouragementMessages = {
  player: [
    "You're a true champion!",
    "Victory is yours!",
    "Amazing job, champion!",
    "You rock! Keep pushing!",
    "Well done! Legendary play!"
  ],
  cpu: [
    "Never give up! You can do it!",
    "It's okay, keep trying!",
    "Don't worry, the next match is yours!",
    "Stay strong, champion in training!",
    "Keep practicing, you're improving!"
  ]
};

// API endpoint
app.get("/encouragement", (req, res) => {
  const winner = req.query.winner;
  if (!["player", "cpu"].includes(winner)) {
    return res.status(400).json({ message: "Invalid winner parameter. Must be 'player' or 'cpu'." });
  }

  const messages = encouragementMessages[winner];
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  console.log(`[Encouragement] winner=${winner} message="${randomMsg}"`);
  res.json({ message: randomMsg });
});

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

// Start server
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
