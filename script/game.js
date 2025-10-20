const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === BACKGROUND MUSIC ===
const bgMusic = new Audio("music/bg.mp3"); 
bgMusic.loop = true;
bgMusic.volume = 0.2;
bgMusic.play();


window.addEventListener("click", () => {
  if (bgMusic.paused) {
    bgMusic.play().catch(err => console.log("Music play blocked:", err));
  }
});

// SOUND EFFECTS
const sounds = {
  spike: new Audio("music/hit.wav"),
  jump: new Audio("music/jump.mp3"),
  ultimate: new Audio("music/ultimate.mp3")
};

Object.values(sounds).forEach(s => {
  sounds.jump.volume = 0.2 ;
  sounds.spike.volume = 0.9;
  sounds.ultimate.volume = 0.9 ;
  s.preload = "auto";
});

let gamePaused = false; 

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function loadImage(src) {
  const img = new Image();
  img.src = `script/${src}`;
  return img;
}

// SPRITES 
const sprites = {
  idle: [loadImage("sprites/idle(1).png"), loadImage("sprites/idle(2).png")],
  walk: [
    loadImage("sprites/walk(1).png"),
    loadImage("sprites/walk(2).png"),
    loadImage("sprites/walk(3).png"),
    loadImage("sprites/walk(4).png"),
  ],
  jump: [loadImage("sprites/jump(1).png"), loadImage("sprites/jump(2).png")],
  spike: [loadImage("sprites/spike(1).png"), loadImage("sprites/spike(3).png")],
  serve: [
    loadImage("sprites/serve1.png"),
    loadImage("sprites/serve2.png"),
    loadImage("sprites/serve3.png"),
  ],
  victory: [loadImage("sprites/victory.png")],
  lose: [loadImage("sprites/lose.png")],
};

// CPU SPRITES
const cpuSprites = {
  idle: [loadImage("sprites_cpu/idle1.png"), loadImage("sprites_cpu/idle2.png")],
  walk: [
    loadImage("sprites_cpu/walk1.png"),
    loadImage("sprites_cpu/walk2.png"),
    loadImage("sprites_cpu/walk3.png"),
    loadImage("sprites_cpu/walk4.png"),
  ],
  jump: [loadImage("sprites_cpu/jump1.png"), loadImage("sprites_cpu/jump2.png")],
  spike: [loadImage("sprites_cpu/spike1.png"), loadImage("sprites_cpu/spike3.png")],
  serve: [
    loadImage("sprites_cpu/serve1.png"),
    loadImage("sprites_cpu/serve2.png"),
    loadImage("sprites_cpu/serve3.png"),
  ],
  victory: [loadImage("sprites_cpu/victory.png")],
  lose: [loadImage("sprites_cpu/lose.png")],
};

// BALL
const ballImg = loadImage("../images/volleyball.png");
const ball = {
  x: 0,
  y: 0,
  radius: 40,
  velocityX: 0,
  velocityY: 0,
  gravity: 0.8,
  bounce: -0.7,
  owner: null,
  netDelay: 0,
  ultimate: false,
  ultimateTimer: 0,
};

// === PLAYER ===
const player = {
  x: window.innerWidth / 2 - 300,
  y: 0,
  width: 200,
  height: 110,
  frame: 0,
  state: "idle",
  frameDelay: 0,
  speed: 8,
  gravity: 1,
  velocityY: 0,
  onGround: true,
  facing: 1,
  scale: 2.2,
};

// CPU
const cpu = {
  x: window.innerWidth / 2 + 300,
  y: 0,
  width: 200,
  height: 110,
  frame: 0,
  state: "idle",
  frameDelay: 0,
  speed: 6,
  gravity: 1,
  velocityY: 0,
  onGround: true,
  facing: -1,
  scale: 2.2,
};

// OFFSETS
let playerXOffset = 60;
let playerYOffset = 110;
let cpuXOffset = 57;
let cpuYOffset = 110;

// INPUT
const keys = {};
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "e") {
    tryPlayerUltimate();
  }
});


// SCORE
let playerScore = 0;
let cpuScore = 0;

// SET SYSTEM
let setTargets = [];
let currentSetIndex = 0;
let playerSets = 0;
let cpuSets = 0;
let matchOver = false;

// SERVE STATE 
let serveBy = "player";
let serveReady = false;
let countdown = 3;
let countdownActive = false;
let countdownTimer = null;

function setGameScore(numSets, pointsPerSet) {

    setTargets = Array(numSets).fill(pointsPerSet);
    currentSetIndex = 0;
    playerScore = 0;
    cpuScore = 0;
    console.log(`Game set to ${numSets} sets, each ${pointsPerSet} points.`);
    
}

// SOUND 
function playBeep() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.15);
}

function resetBall() {
  const groundY = canvas.height * 0.75;

  ball.velocityX = 0;
  ball.velocityY = 0;
  ball.owner = null;
  ball.ultimate = false;
  ball.ultimateTimer = 0;
  ball.netDelay = 0;

  player.state = "idle";
  cpu.state = "idle";

  player.x = canvas.width * 0.25;
  cpu.x = canvas.width * 0.75;

  serveReady = true; 
  if (serveBy === "player") {
    ball.x = player.x + 120;
  } else {
    ball.x = cpu.x - 120;
  }

  ball.y = groundY - ball.radius - 10;
}


// VISUAL EFFECTS
let ballTrail = [];
let hitSparks = [];
let dustPuffs = [];
let fireParticles = [];
let playerStreak = 0;
let cpuStreak = 0;
let streakPopups = [];
let scorePopups = [];
let fireworks = [];

function pushScorePopup(text, x, y, color = "white") {
  scorePopups.push({ text, x, y, color, life: 60 });
}

function drawScorePopups() {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i];
    ctx.save();
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 60;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
    p.y -= 0.6;
    p.life--;
    if (p.life <= 0) scorePopups.splice(i, 1);
  }
}

// Ball Trail
function drawBallTrail() {
  const playerPower = playerStreak >= 3;
  const cpuPower = cpuStreak >= 3;
  const powerActive = playerPower || cpuPower || ball.ultimate;
  const trailLength = powerActive ? 18 : 10;

  ballTrail.push({ x: ball.x, y: ball.y, t: Date.now() });
  if (ballTrail.length > trailLength) ballTrail.shift();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < ballTrail.length; i++) {
    const a = i / ballTrail.length;
    const size = ball.radius * (0.6 + a * 1.6);
    const alpha = 0.12 + a * 0.4;
    ctx.globalAlpha = alpha;
    ctx.drawImage(ballImg, ballTrail[i].x - size / 2, ballTrail[i].y - size / 2, size, size);
  }
  ctx.restore();
}

function drawBallGlow() {
  const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2);
  let glowStrength = Math.min(speed * 0.25, 28);
  if (ball.ultimate) glowStrength += 18;

  const grad = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.4, ball.x, ball.y, ball.radius + glowStrength);
  if (ball.ultimate) {
    grad.addColorStop(0, "rgba(255,180,80,0.9)");
    grad.addColorStop(0.6, "rgba(255,120,50,0.45)");
    grad.addColorStop(1, "rgba(255,60,10,0.0)");
  } else {
    grad.addColorStop(0, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius + glowStrength, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Hit Sparks
function createHitSpark(x, y, big = false) {
  const count = big ? 14 : 8;
  const speed = big ? 9 : 6;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    hitSparks.push({
      x, y,
      vx: Math.cos(angle) * (speed * (0.6 + Math.random() * 0.8)),
      vy: Math.sin(angle) * (speed * (0.6 + Math.random() * 0.8)),
      life: big ? 30 : 16,
      size: big ? 5 + Math.random() * 4 : 3 + Math.random() * 2,
    });
  }
}
function drawHitSparks() {
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    const s = hitSparks[i];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const color = ball.ultimate ? "rgba(255,200,120,0.95)" : "rgba(255,255,255,0.9)";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.94;
    s.vy *= 0.94;
    s.life--;
    if (s.life <= 0) hitSparks.splice(i, 1);
  }
}

// Dust Puffs
function createDust(x, y) {
  for (let i = 0; i < 6; i++) {
    dustPuffs.push({
      x: x + Math.random() * 30 - 15,
      y: y + Math.random() * 6,
      vy: -Math.random() * 1.6 - 0.4,
      size: 7 + Math.random() * 6,
      life: 18 + Math.floor(Math.random() * 8),
    });
  }
}
function drawDust() {
  for (let i = dustPuffs.length - 1; i >= 0; i--) {
    const d = dustPuffs[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, d.life / 28);
    ctx.fillStyle = `rgba(210,210,210,${Math.max(0, d.life / 28)})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    d.y += d.vy;
    d.life--;
    if (d.life <= 0) dustPuffs.splice(i, 1);
  }
}

// Fire Particles
function createFireParticles(x, y, count = 18) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const speed = 3 + Math.random() * 6;
    fireParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 18 + Math.floor(Math.random() * 18),
      size: 6 + Math.random() * 8,
      hue: 20 + Math.random() * 30,
    });
  }
}
function drawFireParticles() {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const f = fireParticles[i];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const alpha = Math.max(0, f.life / 36);
    ctx.fillStyle = `rgba(255,${120 + Math.floor(Math.random() * 60)},90,${alpha})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * (f.life / 36), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.96;
    f.vy *= 0.96;
    f.life--;
    if (f.life <= 0) fireParticles.splice(i, 1);
  }
}

//  Fireworks for set/match win 
function createFirework(x, y) {
  for (let i = 0; i < 28; i++) {
    const ang = Math.random() * Math.PI * 2;
    fireworks.push({
      x, y,
      vx: Math.cos(ang) * (2 + Math.random() * 6),
      vy: Math.sin(ang) * (2 + Math.random() * 6),
      life: 50 + Math.floor(Math.random() * 30),
      size: 3 + Math.random() * 5,
      color: `hsl(${Math.floor(Math.random() * 360)},80%,60%)`,
    });
  }
}
function drawFireworks() {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = f.color;
    ctx.globalAlpha = Math.max(0, f.life / 80);
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= 0.98;
    f.vy *= 0.98;
    f.life--;
    if (f.life <= 0) fireworks.splice(i, 1);
  }
}

// Streak Popups
function handleScoreStreak(winner) {
  if (winner === "player") {
    playerStreak++;
    if (playerStreak === 3) {
      streakPopups.push({ text: "🔥 STREAK!", x: player.x, y: player.y - 110, life: 50 });
    }
  } else {
    cpuStreak++;
    if (cpuStreak === 3) {
      streakPopups.push({ text: "🔥 STREAK!", x: cpu.x, y: cpu.y - 110, life: 50 });
    }
  }
}

function drawStreakPopups() {
  for (let i = streakPopups.length - 1; i >= 0; i--) {
    const s = streakPopups[i];
    ctx.save();
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "orange";
    ctx.globalAlpha = s.life / 50;
    ctx.fillText(s.text, s.x, s.y);
    ctx.restore();
    s.y -= 0.8;
    s.life--;
    if (s.life <= 0) streakPopups.splice(i, 1);
  }
}

// Score handling & Sets
function checkSetWin() {
    if (matchOver) return;

    const target = setTargets[currentSetIndex];

    if (playerScore >= target || cpuScore >= target) {
        let winner = playerScore > cpuScore ? "player" : "cpu";
        if (playerScore === cpuScore) {
            winner = playerLastScorer === "cpu" ? "cpu" : "player";
        }
        if (winner === "player") playerSets++;
        else cpuSets++;
        const lastSetPlayerScore = playerScore;
        const lastSetCpuScore = cpuScore;

        currentSetIndex++;

        if (currentSetIndex >= setTargets.length) {
            matchOver = true;
            showVictoryScreen(playerSets, cpuSets, lastSetPlayerScore, lastSetCpuScore, winner);
        } else {
            playerScore = 0;
            cpuScore = 0;
            console.log(`Starting set ${currentSetIndex + 1}`);
        }
    }
}





function resetMatch() {
  playerScore = 0;
  cpuScore = 0;
  playerStreak = 0;
  cpuStreak = 0;
  playerSets = 0;
  cpuSets = 0;
  currentSetIndex = 0;
  matchOver = false;
  resetBall();
}

let playerLastScorer = null;

function onPointScored(winner) {
  handleScoreStreak(winner);
  playerLastScorer = winner;
  if (winner === "player") {
    pushScorePopup("PLAYER SCORES!", canvas.width * 0.3, canvas.height * 0.18, "cyan");
  } else {
    pushScorePopup("CPU SCORES!", canvas.width * 0.7, canvas.height * 0.18, "salmon");
  }
  checkSetWin();
}

// Ultimate system
function tryPlayerUltimate() {
  if (playerStreak >= 3 && !ball.ultimate && !serveReady && !countdownActive) {
    const inRange =
      Math.abs(ball.x - player.x) < 180 &&
      ball.y > player.y - 220 &&
      ball.y < player.y &&
      ball.owner !== "player";

    if (inRange) {
      ball.ultimate = true;
      ball.ultimateTimer = 60;
      const dir = 1;
      ball.velocityX = 30 * dir;
      ball.velocityY = -10;
      ball.owner = "player";

      createFireParticles(ball.x, ball.y, 26);
      createHitSpark(ball.x, ball.y, true);

      sounds.ultimate.currentTime = 0;
      sounds.ultimate.play();

      playerStreak = 0;

      streakPopups.push({
        text: "ULTIMATE!",
        x: player.x,
        y: player.y - 140,
        life: 60,
      });
    }
  }
}

function cpuUseUltimateIfAvailable() {
  if (cpuStreak >= 3 && !ball.ultimate) {
    ball.ultimate = true;
    ball.ultimateTimer = 60;
    const dir = -1;
    ball.velocityX = -30 * (0.9 + Math.random() * 0.2);
    ball.velocityY = -10 - Math.random() * 3;
    ball.owner = "cpu";

    createFireParticles(ball.x, ball.y, 26);
    createHitSpark(ball.x, ball.y, true);

    sounds.ultimate.currentTime = 0;
    sounds.ultimate.play();

    cpuStreak = 0;

    streakPopups.push({
      text: "CPU ULTIMATE!",
      x: cpu.x,
      y: cpu.y - 140,
      life: 60,
    });
  }
}


function drawArcadeEffects() {
  drawBallTrail();
  drawBallGlow();
  drawFireParticles(); 
  drawHitSparks();
  drawDust();
  drawStreakPopups();
  drawScorePopups();
  drawFireworks();
}

let lastPlayerHit = 0;
let lastCpuHit = 0;
const hitCooldown = 180; 
let cpuServeTimeout = false; 

function update() {
  if (gamePaused) return;
  const groundY = canvas.height * 0.75;
  const netX = canvas.width / 2;
  const netHeight = canvas.height * 0.12;
  const netHalfWidth = 4;

  // PLAYER CONTROL
  if (!matchOver) {
    let newState = player.state; // start with current state

    // PLAYER SERVE
    if (keys["q"] && serveBy === "player" && serveReady) {
      player.state = "serve";

      ball.velocityX = 10;
      ball.velocityY = -14;
      ball.owner = "player";

      serveReady = false;
      createHitSpark(ball.x, ball.y);
      sounds.spike.currentTime = 0;
         sounds.spike.play();

      setTimeout(() => {
        if (!matchOver && player.onGround) player.state = "idle";
      }, 300);

    } else {
      // LEFT/RIGHT MOVEMENT
      if (keys["a"]) {
        player.x -= player.speed;
        player.facing = -1;
        if (player.onGround) newState = "walk";
      } else if (keys["d"]) {
        player.x += player.speed;
        player.facing = 1;
        if (player.onGround) newState = "walk";
      } else {
        if (player.onGround) newState = "idle";
      }

      // JUMP
      if (keys[" "] && player.onGround) {
        player.velocityY = -20;
        player.onGround = false;
        newState = "jump";
        createDust(player.x, groundY);
        sounds.jump.currentTime = 0;
        sounds.jump.play();
      }

      if (!player.onGround) newState = "jump";

      // SPIKE HIT
      const now = Date.now();
      const horizontalReach = 124;
      const verticalTop = player.y - 100; 
      const verticalBottom = player.y + 20; 
      const playerNearBallHoriz = Math.abs(ball.x - player.x) < horizontalReach;
      const playerNearBallVert = ball.y > verticalTop && ball.y < verticalBottom;

  if (keys["w"]) {
    newState = "spike";

    const now = Date.now();
    const horizontalReach = 124;
    const verticalTop = player.y - 100;
    const verticalBottom = player.y + 20;
    const playerNearBallHoriz = Math.abs(ball.x - player.x) < horizontalReach;
    const playerNearBallVert = ball.y > verticalTop && ball.y < verticalBottom;

    if (!ball.ultimate && playerNearBallHoriz && playerNearBallVert && ball.owner !== "player" && now - lastPlayerHit > hitCooldown) {
        const inAir = !player.onGround;
        const powerX = 12 + (inAir ? 1 : 0);
        const powerY = -15 - (inAir ? 1 : 0);

        ball.velocityX = powerX * (player.facing === 1 ? 1 : -1);
        ball.velocityY = powerY;
        ball.owner = "player";
        createHitSpark(ball.x, ball.y);
          sounds.spike.currentTime = 0;
         sounds.spike.play();
        if (inAir) createDust(player.x, groundY);
        lastPlayerHit = now;
    }
}

    }

    player.state = newState;

// CPU SERVE

if (serveBy === "cpu" && serveReady && ball.owner === null && !cpuServeTimeout) {
  cpuServeTimeout = true;     
  cpu.state = "idle";          
  ball.x = cpu.x - 120;
  ball.y = canvas.height * 0.75 - ball.radius - 10;

  setTimeout(() => {
    if (!matchOver && serveBy === "cpu") {
      cpu.state = "serve";
      const targetHeight = Math.random() * -6 - 10;
      ball.velocityX = -(7 + Math.random() * 3);
      ball.velocityY = targetHeight;
      ball.owner = "cpu";

      serveReady = false;

      setTimeout(() => {
        if (!matchOver && cpu.onGround) cpu.state = "idle";
      }, 600);

      cpuServeTimeout = false; 
    } else {
      cpuServeTimeout = false;
    }
  }, 3000); 
}

  }



  // GRAVITY & BOUNDS
  player.y += player.velocityY;
  player.velocityY += player.gravity;
  if (player.y >= groundY) {
    player.y = groundY;
    player.velocityY = 0;
    if (!player.onGround) createDust(player.x, groundY);
    player.onGround = true;
  }
  if (player.x < 100) player.x = 100;
  if (player.x > netX - 180) player.x = netX - 180;

  cpu.y += cpu.velocityY;
  cpu.velocityY += cpu.gravity;
  if (cpu.y >= groundY) {
    cpu.y = groundY;
    cpu.velocityY = 0;
    if (!cpu.onGround) createDust(cpu.x, groundY);
    cpu.onGround = true;
  }

  // CPU AI
if (!serveReady && !countdownActive && !matchOver) {
  if (ball.x > netX) {
    const targetX = Math.max(netX + 170, Math.min(ball.x, canvas.width - 50));
    const distanceX = Math.abs(targetX - cpu.x);

    if (distanceX > 15) {
      const moveSpeed = cpu.speed + Math.min(distanceX / 50, 3);
      cpu.x += targetX < cpu.x ? -moveSpeed : moveSpeed;
      if (cpu.onGround) cpu.state = "walk";
    } else if (cpu.onGround) {
      cpu.state = "idle";
    }

    const nearBallX = Math.abs(ball.x - cpu.x) < 120;
    const nearBallY = Math.abs(ball.y - cpu.y) < 130;
    const ballAboveCPUFeet = ball.y < cpu.y - 10; 
    const canHit = nearBallX && nearBallY && ballAboveCPUFeet && cpu.onGround;

    if (canHit && !ball.ultimate) {
        const now = Date.now();
        if (now - lastCpuHit > hitCooldown) {
            if (cpuStreak >= 3) {
                cpuUseUltimateIfAvailable();
            } else {
                cpu.velocityY = -10;
                cpu.onGround = false;
                cpu.state = "spike";

                ball.velocityX = -10 - Math.random() * 2;
                ball.velocityY = -15 - Math.random() * 4;
                ball.owner = "cpu";
                createHitSpark(ball.x, ball.y);
                sounds.spike.currentTime = 0;
                sounds.spike.play();
            }
            lastCpuHit = now;
            setTimeout(() => { if(!matchOver) cpu.state = "idle"; }, 500);
        }
    }
  } else {
    if (cpu.onGround) cpu.state = "idle";
  }
}


  // BALL PHYSICS
  if (!serveReady && !countdownActive) {
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    ball.velocityY += ball.gravity;
  } else {
    ball.y = groundY - ball.radius - 10;
    if (serveBy === "player") ball.x = player.x + 120;
    else ball.x = cpu.x - 120;
    ball.velocityX = 0;
    ball.velocityY = 0;
  }

  if (ball.ultimate) {
    ball.ultimateTimer--;
    if (ball.ultimateTimer <= 0) {
      ball.ultimate = false;
      ball.ultimateTimer = 0;
    }
  }

// GROUND CONTACT
const groundLevel = canvas.height * 0.88;

if (ball.bounced === undefined) ball.bounced = false;
if (ball.rolling === undefined) ball.rolling = false;

if (ball.y + ball.radius >= groundLevel) {
    ball.y = groundLevel - ball.radius;

    if (!ball.bounced) {
        ball.y -= 5;           
        ball.velocityX *= 0.3;  
        createDust(ball.x, groundLevel); 
        ball.bounced = true;
        ball.rolling = true;
    } else if (ball.rolling) {
        ball.velocityX *= 0.9;
        if (Math.abs(ball.velocityX) < 0.5) {
            ball.velocityX = 0;
            ball.velocityY = 0;

            if (ball.x < netX) {
                cpuScore++;
                onPointScored("cpu");
                serveBy = "cpu";
            } else {
                playerScore++;
                onPointScored("player");
                serveBy = "player";
            }

            ball.bounced = false;
            ball.rolling = false;
            resetBall();
        }
    }
}

  // NET COLLISION 
  if (
    ball.x + ball.radius > netX - netHalfWidth &&
    ball.x - ball.radius < netX + netHalfWidth &&
    ball.y > groundY - netHeight
  ) {
    ball.netDelay++;
    if (ball.netDelay > 3) {
      ball.velocityX *= -0.8;
      ball.x = ball.x < netX ? netX - ball.radius - netHalfWidth : netX + ball.radius + netHalfWidth;
      createHitSpark(ball.x, ball.y, false);
      ball.netDelay = 0;
    }
  } else {
    ball.netDelay = 0;
  }

  // WALL COLLISION
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.velocityX *= -1;
  } 
  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.velocityX *= -1;
  }

  // ANIMATIONS
  player.frameDelay++;
  if (player.frameDelay > 10) {
    player.frameDelay = 0;
    const anim = sprites[player.state];
    if (anim) player.frame = (player.frame + 1) % anim.length;
  }

  cpu.frameDelay++;
  if (cpu.frameDelay > 15) {
    cpu.frameDelay = 0;
    const anim = cpuSprites[cpu.state];
    if (anim) cpu.frame = (cpu.frame + 1) % anim.length;
  }
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const groundY = canvas.height * 0.85;
  const netX = canvas.width / 2;
  const netHeight = canvas.height * 0.175;
  const netWidth = 6;

  // COURT / NET
  ctx.fillStyle = "#ffffff22";
  ctx.fillRect(netX - netWidth / 6, groundY - (netHeight + 50), netWidth, netHeight + 50); // 10px taller

  // PLAYER
  const anim = sprites[player.state];
  if (anim) {
    const img = anim[player.frame];
    if (img && img.complete) {
      ctx.save();
      const drawWidth = player.width * player.scale;
      const drawHeight = player.height * player.scale;
      if (player.facing === -1) {
        ctx.scale(-1, 1);
        ctx.drawImage(img, -player.x - drawWidth / 2 - playerXOffset, player.y - drawHeight + playerYOffset, drawWidth, drawHeight);
      } else {
        ctx.drawImage(img, player.x - drawWidth / 2 + playerXOffset, player.y - drawHeight + playerYOffset, drawWidth, drawHeight);
      }
      ctx.restore();
    }
  }

  // CPU
  const cpuAnim = cpuSprites[cpu.state];
  if (cpuAnim) {
    const cpuImg = cpuAnim[cpu.frame];
    if (cpuImg && cpuImg.complete) {
      ctx.save();
      const drawWidth = cpu.width * cpu.scale;
      const drawHeight = cpu.height * cpu.scale;
      if (cpu.facing === -1) {
        ctx.scale(-1, 1);
        ctx.drawImage(cpuImg, -cpu.x - drawWidth / 2 + cpuXOffset, cpu.y - drawHeight + cpuYOffset, drawWidth, drawHeight);
      } else {
        ctx.drawImage(cpuImg, cpu.x - drawWidth / 2 + cpuXOffset, cpu.y - drawHeight + cpuYOffset, drawWidth, drawHeight);
      }
      ctx.restore();
    }
  }

  // BALL EFFECTS
  drawBallTrail();
  drawBallGlow();
  drawFireParticles();

  if (ballImg.complete) {
    if (ball.ultimate) {
    }
    ctx.drawImage(ballImg, ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2);
  }

  drawHitSparks();
  drawDust();
  drawStreakPopups();
  drawScorePopups();
  drawFireworks();

 // BEACH SCOREBOARD
ctx.save();
ctx.textAlign = "center";

const sandToSky = ctx.createLinearGradient(0, 0, canvas.width, 0);
sandToSky.addColorStop(0, "#000000ff"); 
sandToSky.addColorStop(0.5, "#000000ff");
sandToSky.addColorStop(1, "#000000ff"); 
ctx.shadowColor = "hsla(0, 0%, 100%, 0.90)";
ctx.font = "bold 37px 'Press Start 2P', Arial";
ctx.textBaseline = "middle";  
ctx.fillStyle = sandToSky;

ctx.shadowBlur = 15;

const displayText = `${playerScore}   ${cpuScore}`;
const paddingTop = 41; 
ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 - paddingTop); 
ctx.restore();

ctx.save();

const labelWidth = 0;
const labelHeight = 0;
const labelX =  0;
const labelY = 0;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);

ctx.restore();

// ULTIMATE READY
if (playerStreak >= 3) {
  ctx.save();
  const time = Date.now() / 250;
  const flicker = Math.sin(time) * 0.5 + 0.5;

  const fire = ctx.createLinearGradient(0, 0, canvas.width, 0);
  fire.addColorStop(0, `rgba(255, ${100 + 155 * flicker}, 0, 1)`);
  fire.addColorStop(0.4, `rgba(255, ${50 + 205 * flicker}, 60, 1)`);
  fire.addColorStop(0.7, `rgba(255, ${120 + 100 * flicker}, 0, 1)`);
  fire.addColorStop(1, `rgba(255, ${80 + 175 * flicker}, 40, 1)`);

  ctx.font = "bold 20px 'Press Start 2P', Arial";
  ctx.fillStyle = fire;
  ctx.textAlign = "center";
  ctx.shadowColor = `rgba(255, ${80 + 100 * flicker}, 0, 0.9)`;
  ctx.shadowBlur = 40;
  ctx.fillText("🔥 HANDA NA ANG POWER MO! (E) 🔥", canvas.width / 2, 150);
  ctx.restore();
}

// CPU Power Ready
if (cpuStreak >= 3) {
  ctx.save();
  const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
  ctx.font = "bold 20px 'Press Start 2P', Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, ${150 + 50 * pulse}, ${150 + 30 * pulse}, 1)`;
  ctx.shadowColor = `rgba(255, 80, 80, 0.8)`;
  ctx.shadowBlur = 20;
  ctx.fillText("MAG HANDA KA SA DARATING⚡", canvas.width / 2, 190);
  ctx.restore();
}

// PLAYER TURN TO SERVE
if (serveBy === "player" && ball.owner === null && !matchOver) {
    ctx.save();
    ctx.font = "bold 28px 'Press Start 2P', Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("PRESS Q TO SERVE", canvas.width / 2, 200);
    ctx.restore();
}


}
let animationId; 
let gameContainer = document.body;

const pauseMenu = document.createElement('div');
pauseMenu.style.position = 'fixed';
pauseMenu.style.top = '0';
pauseMenu.style.left = '0';
pauseMenu.style.width = '100%';
pauseMenu.style.height = '100%';
pauseMenu.style.background = 'rgba(0,0,0,0.75)';
pauseMenu.style.display = 'flex';
pauseMenu.style.flexDirection = 'column';
pauseMenu.style.alignItems = 'center';
pauseMenu.style.justifyContent = 'center';
pauseMenu.style.zIndex = '1000';
pauseMenu.style.fontFamily = "'Press Start 2P', monospace";
pauseMenu.style.color = '#fff';
pauseMenu.style.fontSize = '20px';
pauseMenu.style.textAlign = 'center';
pauseMenu.style.display = 'none'; 

const link = document.createElement('link');
link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

// Title
const title = document.createElement('div');
title.style.fontSize = '40px';
title.textContent = 'GAME PAUSED';
title.style.marginBottom = '50px';
pauseMenu.appendChild(title);

// Buttons
const buttons = ['RESUME', 'RESTART', 'EXIT'];
buttons.forEach(text => {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.margin = '10px';
  btn.style.padding = '12px 25px';
  btn.style.fontSize = '16px';
  btn.style.cursor = 'pointer';
  btn.style.border = 'none';
  btn.style.borderRadius = '0';
  btn.style.backgroundColor = 'transparent';
  btn.style.color = '#fff';
  btn.style.textTransform = 'uppercase';
  btn.style.fontFamily = "'Press Start 2P', sans-serif";
  btn.onmouseover = () => btn.style.color = '#FFD700';
  btn.onmouseout = () => btn.style.color = '#fff';
  pauseMenu.appendChild(btn);

  if (text === 'RESUME') btn.onclick = resumeGame;
  if (text === 'RESTART') btn.onclick = restartGame;
  if (text === 'EXIT') btn.onclick = () => window.location.href = 'game-menu.html';
});

gameContainer.appendChild(pauseMenu);

// Pause / Resume Logic

document.addEventListener('keydown', e => {
  if (e.key === "Escape") {
    if (!gamePaused) pauseGame();
    else resumeGame();
  }
});

function pauseGame() {
  gamePaused = true;
  pauseMenu.style.display = 'flex';
 
}

function resumeGame() {
  gamePaused = false;
  pauseMenu.style.display = 'none';
}

function restartGame() {
  location.reload();
}

function startGame() {
    const numSets = window.gameSettings?.sets || 1;
    const pointsPerSet = window.gameSettings?.points || 5;
    setGameScore(numSets, pointsPerSet);
    resetMatch();
    gamePaused = false;
    requestAnimationFrame(Loop);
}

// LOOP
function loop() {
  draw();
  update();

  if (matchOver) {
    cancelAnimationFrame(animationId);
    showVictoryScreen(playerSets, cpuSets, playerSets > cpuSets ? "player" : "cpu");
    return;
  }

  animationId = requestAnimationFrame(loop);
}


function showVictoryScreen(playerSets, cpuSets, lastSetPlayerScore, lastSetCpuScore, winner) {
  if (document.getElementById("victoryOverlay")) return;

  matchOver = true;
  if (animationId) cancelAnimationFrame(animationId);

  bgMusic.pause();
  bgMusic.currentTime = 0;

  const victoryMusic = new Audio("music/victory.ogg  "); 
  victoryMusic.volume = 0.6; 
  victoryMusic.loop = false; 
  victoryMusic.play().catch(err => console.log("Audio playback blocked:", err));

  const overlay = document.createElement("div");
  overlay.id = "victoryOverlay";
  overlay.innerHTML = `
    <div class="victory-left">
      <canvas id="celebrationCanvas" width="500" height="500"></canvas>
      <div class="victory-banner"><h1>${winner === "player" ? "VICTORY!" : "CPU WINS!"}</h1></div>
    </div>
    <div class="victory-right">
      <div class="score-box">
        <div class="score-title">FINAL SCORE</div>
            <div class="score-value">${lastSetPlayerScore}:${lastSetCpuScore}</div>
      </div>
      <div id="encouragementText" class="encouragement-text">Loading message...</div>
      <div class="button-container">
        <button id="rematchBtn" class="menu-btn rematch">REMATCH</button>
        <button id="exitBtn" class="menu-btn exit">EXIT TO START MENU</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  // Buttons
  overlay.querySelector("#rematchBtn").onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => location.reload(), 300);
  };

  overlay.querySelector("#exitBtn").onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => (window.location.href = "game-menu.html"), 300);
  };

  // Confetti
  const canvasAnim = document.getElementById("celebrationCanvas");
  const ctx = canvasAnim.getContext("2d");
  const confettiParticles = [];
  const confettiCount = 100;

  for (let i = 0; i < confettiCount; i++) {
    confettiParticles.push({
      x: Math.random() * canvasAnim.width,
      y: Math.random() * canvasAnim.height,
      size: Math.random() * 6 + 4,
      speedY: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      tilt: Math.random() * 15,
      tiltSpeed: Math.random() * 0.1 + 0.05
    });
  }

  function updateConfetti() {
    for (let p of confettiParticles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.tilt += p.tiltSpeed;
      if (p.y > canvasAnim.height) { p.y = -10; p.x = Math.random() * canvasAnim.width; }
      if (p.x > canvasAnim.width) p.x = 0;
      if (p.x < 0) p.x = canvasAnim.width;
    }
  }

  function drawConfetti() {
    for (let p of confettiParticles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x + p.tilt, p.y);
      ctx.lineTo(p.x + p.tilt + p.size / 2, p.y + p.size);
      ctx.lineTo(p.x + p.tilt - p.size / 2, p.y + p.size);
      ctx.closePath();
      ctx.fill();
    }
  }

  function confettiLoop() {
    ctx.clearRect(0, 0, canvasAnim.width, canvasAnim.height);
    updateConfetti();
    drawConfetti();
    requestAnimationFrame(confettiLoop);
  }
  requestAnimationFrame(confettiLoop);

// Encouragement text
const textDiv = overlay.querySelector("#encouragementText");
let typingInterval = null;
let messageInterval = null;

function typeText(element, text, speed) {
  if (!element) return;
  element.textContent = "";
  let i = 0;
  clearInterval(typingInterval);
  typingInterval = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(typingInterval);
  }, speed);
}

function startEncouragementLoop(winner) {
  if (!winner || !["player", "cpu"].includes(winner)) return;

  const encouragementElement = document.getElementById("encouragementText");
  if (!encouragementElement) {
    console.error("⚠️ encouragementText element not found!");
    return;
  }

  if (messageInterval) clearInterval(messageInterval);

  function fetchAndType() {
    console.log("🟢 Fetching encouragement for:", winner);

    const jsonURL = `${window.location.origin}${window.location.pathname.replace(/\/[^\/]*$/, '')}/encouragement.json?t=${Date.now()}`;
    fetch(jsonURL)
    fetch(jsonURL)
      .then(res => {
        console.log("🟡 Fetch status:", res.status);
        if (!res.ok) throw new Error("HTTP error " + res.status);
        return res.json();
      })
      .then(data => {
        console.log("✅ Data loaded:", data);
        const messages = data[winner];
        if (!messages) throw new Error("No messages found for " + winner);
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        console.log("✨ Message:", randomMsg);
        typeText(encouragementElement, randomMsg, 50);
      })
      .catch(err => {
        console.error("❌ Encouragement fetch failed:", err);
        typeText(encouragementElement, "Laban lang, wag bibitaw!", 50);
      });
  }

  fetchAndType();
  messageInterval = setInterval(fetchAndType, 6000);
}


startEncouragementLoop(winner);

}

loop();
resetBall();
