const socket = io();

const mainMenu = document.getElementById("main-menu");
const joinForm = document.getElementById("join-form");
const lobby = document.getElementById("lobby");
const gameStartTitle = document.getElementById("game-start-title");
const game = document.getElementById("game");
const createRoomBtn = document.getElementById("create-room");
const joinRoomBtn = document.getElementById("join-room");
const submitJoinBtn = document.getElementById("submit-join");
const startGameBtn = document.getElementById("start-game");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code");
const roomCodeDisplay = document.getElementById("room-code-display");
const playerList = document.getElementById("player-list");
const roomStatus = document.getElementById("room-status");
const lobbyTitle = document.getElementById("lobby-title");
const gyroContainer = document.getElementById("container");

let currentRoom = null;
let isHost = false;
let gyroscopeInterval = null;
const gyroscopeData = { alpha: 0, beta: 0, gamma: 0 };
let globalMaze;

let numRows = 10;
let numCols = 10;

class Maze {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = this.createGrid();
    this.walls = [];
    this.generateMaze(0, 0);
  }

  createGrid() {
    const grid = [];
    for (let x = 0; x < this.width; x++) {
      grid[x] = [];
      for (let y = 0; y < this.height; y++) {
        grid[x][y] = { visited: false, walls: [true, true, true, true] }; // top, right, bottom, left
      }
    }
    return grid;
  }

  generateMaze(cx, cy) {
    const directions = [
      { dx: 0, dy: -1, wall: 0, opposite: 2 }, // Up
      { dx: 1, dy: 0, wall: 1, opposite: 3 }, // Right
      { dx: 0, dy: 1, wall: 2, opposite: 0 }, // Down
      { dx: -1, dy: 0, wall: 3, opposite: 1 }, // Left
    ];

    this.grid[cx][cy].visited = true;

    // Shuffle directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const { dx, dy, wall, opposite } of directions) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (
        nx >= 0 &&
        nx < this.width &&
        ny >= 0 &&
        ny < this.height &&
        !this.grid[nx][ny].visited
      ) {
        this.grid[cx][cy].walls[wall] = false;
        this.grid[nx][ny].walls[opposite] = false;
        this.generateMaze(nx, ny);
      }
    }
  }

  getWalls() {
    const walls = [];
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (this.grid[x][y].walls[0])
          walls.push({ column: x, row: y, horizontal: true, length: 1 });
        if (this.grid[x][y].walls[1])
          walls.push({ column: x + 1, row: y, horizontal: false, length: 1 });
        if (this.grid[x][y].walls[2])
          walls.push({ column: x, row: y + 1, horizontal: true, length: 1 });
        if (this.grid[x][y].walls[3])
          walls.push({ column: x, row: y, horizontal: false, length: 1 });
      }
    }
    return walls;
  }
}

function generateNewMaze(rows, cols) {
  const maze = new Maze(rows, cols);
  const walls = maze.getWalls();
  return JSON.stringify(walls, null, 2);
}

createRoomBtn.addEventListener("click", () => {
  socket.emit("createRoom");
});

joinRoomBtn.addEventListener("click", () => {
  mainMenu.style.display = "none";
  joinForm.style.display = "block";
});

submitJoinBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();
  if (name && roomCode) {
    socket.emit("joinRoom", { name, roomCode });
  }
});

startGameBtn.addEventListener("click", (players) => {
  if (currentRoom) {
    if (isHost) {
      const roomCode = roomCodeDisplay.textContent.trim();
      const map = JSON.parse(generateNewMaze(numRows, numCols));
      socket.emit("transmitMap", { map, roomCode });
      socket.emit("startGame", currentRoom);
    }
  }
});
socket.on("receieveMap",(maze)=>{
  console.log(maze)
  globalMaze = maze;
  console.log("MONEY BABY")
})

socket.on("roomCreated", (roomCode) => {
  currentRoom = roomCode;
  isHost = true;
  mainMenu.style.display = "none";
  lobby.style.display = "block";
  roomCodeDisplay.textContent = roomCode;
  startGameBtn.style.display = "block";
  roomStatus.textContent = "Waiting for players...";
});

socket.on("joinedRoom", ({ roomCode, host: hostStatus }) => {
  currentRoom = roomCode;
  isHost = hostStatus;
  joinForm.style.display = "none";
  lobby.style.display = "block";
  roomCodeDisplay.textContent = roomCode;
  if (isHost) {
    startGameBtn.style.display = "block";
  }
});

socket.on("playerJoined", ({ name, room }) => {
  const li = document.createElement("li");
  li.textContent = name;
  playerList.appendChild(li);
});

socket.on("updatePlayerList", (players) => {
  updatePlayerList(players);
});

socket.on("playerLeft", ({ name }) => {
  const players = Array.from(playerList.children);
  const playerToRemove = players.find((p) => p.textContent === name);
  if (playerToRemove) {
    playerList.removeChild(playerToRemove);
  }
  roomStatus.textContent = "Waiting for players...";
});

socket.on("roomFull", () => {
  roomStatus.textContent = "Room is full. Ready to start!";
  if (isHost) {
    startGameBtn.disabled = false;
  }
});

socket.on("gameStarted", (room) => {
  lobby.style.display = "none";
  gameStartTitle.style.display = "block";
  game.style.display = "flex";
  game.style.flexDirection = "column";
  game.style.alignItems = "center";

  if (!isHost) {
    // Request permission to use the gyroscope on mobile devices
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
            startSendingGyroscopeData();
          }
        })
        .catch(console.error);
    } else {
      // For devices that don't require permission
      window.addEventListener("deviceorientation", handleOrientation);
      startSendingGyroscopeData();
    }
  } else {
    gyroContainer.style.display = "none";
    playerList.style.display = "block";
    lobbyTitle.style.display = "none";
    roomStatus.style.display = "none";
    startGameBtn.style.display = "none";
    lobby.style.display = "block";
    playerList.innerHTML = "";
    globalMaze.room.players.forEach((player) => {
      const li = document.createElement("li");
      li.textContent = player.name;
      li.style.color = colors[player.pid];
      playerList.appendChild(li);
    });
  }

});

socket.on("error", (message) => {
  alert(message);
});

function updatePlayerList(players) {
  playerList.innerHTML = "";
  players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    playerList.appendChild(li);
  });

  if (players.length < 4) {
    roomStatus.textContent = `Waiting for players... (${players.length}/4)`;
    if (isHost && players.length >= 1) {
      startGameBtn.disabled = false;
    }
  } else {
    roomStatus.textContent = "Room is full. Ready to start!";
    if (isHost) {
      startGameBtn.disabled = false;
    }
  }
}

// Add this function to handle gyroscope data
function handleOrientation(event) {
  gyroscopeData.alpha = event.alpha; // Z-axis rotation
  gyroscopeData.beta = event.beta; // X-axis rotation
  gyroscopeData.gamma = event.gamma; // Y-axis rotation
}

// Add this function to start sending gyroscope data
function startSendingGyroscopeData() {
  if (!isHost) {
    gyroscopeInterval = setInterval(() => {
      socket.emit("gyroscopeData", {
        roomCode: currentRoom,
        data: gyroscopeData,
      });
    }, 100); // Send data every 100ms
  }
}

// Add this to clean up when the game ends or the user disconnects
function stopSendingGyroscopeData() {
  if (gyroscopeInterval) {
    clearInterval(gyroscopeInterval);
    gyroscopeInterval = null;
  }
  window.removeEventListener("deviceorientation", handleOrientation);
}

// Add a handler for gyroscope data on the host side
socket.on("gyroscopeUpdate", ({ playerId, data, room }) => {
  updateGyroscopeDisplay(playerId, data, room);
});

// Function to update the gyroscope display on the host screen
function updateGyroscopeDisplay(playerId, data, room) {
  document.body.style.setProperty('background', softColors[room.players.findIndex((player) => player.id === socket.id)], 'important');
  const playerElement = document.getElementById(`player-${playerId}`);

  if (!playerElement) {
    const text = document.createElement("div");
    text.id = `player-${playerId}-text`;

    const newPlayerElement = document.createElement("div");
    newPlayerElement.id = `player-${playerId}`;
    newPlayerElement.classList.add("garden");

    const ball = document.createElement("div");
    ball.id = `player-${playerId}-ball`;
    ball.classList.add("ball");

    document.getElementById("gyroscope-data").appendChild(newPlayerElement);
    document.getElementById(`player-${playerId}`).appendChild(ball);
    document.getElementById(`player-${playerId}`).appendChild(text);
  }

  updateThing(
    document.getElementById(`player-${playerId}`),
    document.getElementById(`player-${playerId}-ball`),
    data.beta,
    data.gamma
  );

  document.getElementById(
    `player-${playerId}-text`
  ).textContent = `Player ${playerId}:
  Beta: ${data.beta}, Gamma: ${data.gamma}`;
}

function updateThing(garden, ball, beta, gamma) {
  const maxX = garden.clientWidth - ball.clientWidth;
  const maxY = garden.clientHeight - ball.clientHeight;

  let x = beta; // In degree in the range [-180,180)
  let y = gamma; // In degree in the range [-90,90)

  if (x > 90) {
    x = 90;
  }
  if (x < -90) {
    x = -90;
  }

  // To make computation easier we shift the range of
  // x and y to [0,180]
  x += 90;
  y += 90;
  ball.style.left = `${(maxY * y) / 180 - 10}px`; // rotating device around the y axis moves the ball horizontally
  ball.style.top = `${(maxX * x) / 180 - 10}px`; // rotating device around the x axis moves the ball vertically
}

const darkZones = [
  { x: 50, y: 50, width: 100, height: 100 },
  { x: 200, y: 200, width: 100, height: 100 },
];

function drawDarkZones(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
  darkZones.forEach((zone) => {
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
  });
}

function isInDarkZone(ball, zone) {
  return (
    ball.x + ball.radius > zone.x &&
    ball.x - ball.radius < zone.x + zone.width &&
    ball.y + ball.radius > zone.y &&
    ball.y - ball.radius < zone.y + zone.height
  );
}
