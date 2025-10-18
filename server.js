// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname));

// === Filipino mapang-asar encouragement lines ===
const encouragementMessages = {
  player: [
    "Ayos! Parang walang kahirap-hirap sayo!",
    "Grabe, parang di mo pinapawisan!",
    "Lupit mo idol, CPU lang pala kalaban mo!",
    "Boom! Ganyan ba talaga pag pro?",
    "Angas! CPU nalang umiiyak oh!",
    "Walang sinabi ‘yung kalaban!",
    "Easy win, parang warm-up lang!",
    "Napaangat CPU ah, pero bagsak din!",
    "Wala kang kapantay, boss!",
    "Grabe, para kang e-sports champion!",
    "CPU na lang ang naiiwan sa dust!",
    "Di mo na kailangan ng cheat code!",
    "Panalo na naman, parang routine mo na!",
    "Walang mercy si boss!",
    "Gigil na gigil si CPU sayo!",
    "Wala kang preno ah!",
    "Literal na bugbog CPU mo!",
    "Ayan na! Legendary streak incoming!",
    "CPU na naman ang nilamon ng alikabok!",
    "Sobrang galing mo, baka ikaw ang developer!",
    "Walang sinabi ang AI sa human power!",
    "Pinahiya mo si CPU, bro!",
    "Talo CPU, basag confidence!",
    "Angas! Parang scripted ‘tong panalo mo!",
    "Ikaw talaga ang hari ng court!",
    "CPU: Error 404 — WALA NANG PAG-ASA!",
    "Panalo ulit? Normal day sa’yo ‘yan!",
    "CPU na lang ang hindi maka-move on!",
    "Ikaw talaga ang tunay na MVP!",
    "Pambihira ka, parang cheat code!"
  ],

  cpu: [
    "HAHA! Tinalo ka ng CPU, bro!",
    "Aba, nagulat ka noh?",
    "Sakit sa ego? Practice pa!",
    "CPU lang ‘to ha, pero talo ka!",
    "Ano ‘yan? Kinain ka ng AI!",
    "Tulog ka ba? Ang bagal mo kanina!",
    "Sayang! Konting focus pa sana!",
    "CPU 1 — Player 0, HAHA!",
    "Ayun, binigyan ka ni CPU ng reality check!",
    "Ouch, parang gusto mo na mag rematch?",
    "CPU: ‘Di ko sinasadya, boss! 😂",
    "Tinalo ka ng algorithm, hahaha!",
    "Ang CPU nag-evolve, ikaw hindi!",
    "Talo? Bawi next time, baka swerte lang si CPU!",
    "CPU na ‘to, pero parang may kaluluwa ah!",
    "Hala! Pina-iyak ka ni bot!",
    "CPU: ‘Wag kang iiyak, player!",
    "Angas mo kanina, tahimik ka na ngayon ah 😏",
    "CPU pa lang ‘yan bro, paano pag human kalaban?",
    "CPU: Easy lang ako sayo ah!",
    "Bot ka rin ba? Kasi parehas kayong talo 😂",
    "Masakit ‘to, pero totoo — CPU > You!",
    "CPU nagliliyab, ikaw nalulunod!",
    "CPU: Hehe, sorry not sorry 😎",
    "Oof! CPU nang-asar lang, wag ka magalit 😜",
    "AI supremacy confirmed!",
    "Nadali ka ng script ko!",
    "Player disconnected? Haha, lag ba yan?",
    "CPU nag fiesta sa scoreboard!",
    "Bawi ka nalang sa susunod, bro!"
  ]
};

// === Message shuffling and queue logic ===
const messageQueues = { player: [], cpu: [] };

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getNextMessage(winner) {
  if (!messageQueues[winner] || messageQueues[winner].length === 0) {
    messageQueues[winner] = shuffleArray([...encouragementMessages[winner]]);
  }
  return messageQueues[winner].shift();
}

// === Endpoint 1: Random encouragement ===
app.get("/encouragement", (req, res) => {
  const winner = req.query.winner;
  if (!["player", "cpu"].includes(winner)) {
    return res.status(400).json({ message: "Invalid winner parameter" });
  }

  const msg = getNextMessage(winner);
  console.log(`[SERVER] ${winner} message sent → "${msg}"`);
  res.json({ message: msg });
});

// === Endpoint 2: Show ALL encouragement messages ===
app.get("/allMessages", (req, res) => {
  const winner = req.query.winner;
  if (!["player", "cpu"].includes(winner)) {
    return res.status(400).json({ messages: [] });
  }

  console.log(`[SERVER] Sending all messages for ${winner}`);
  res.json({ messages: encouragementMessages[winner] });
});

// === Default route ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "game.html"));
});

// === Start server ===
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
