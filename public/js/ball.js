//Global Variables
let colors = ["red", "green", "blue", "purple"];
let softColors = ["red", "green", "blue", "purple"];
let key;

//Helper Functions

Math.minmax = (value, limit) => {
  return Math.max(Math.min(value, limit), -limit);
}; // It makes sure that the value is not larger than limit and not smaller than -limit.

//Distance Calculation
const distance2D = (p1, p2) => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}; //calculates the distance between two points using the Pythagorean theorem.

// Angle Calculation
const getAngle = (p1, p2) => {
  let angle = Math.atan((p2.y - p1.y) / (p2.x - p1.x));
  if (p2.x - p1.x < 0) angle += Math.PI;
  return angle;
}; // calculates the angle between two points, p1 and p2, using atan (arctangent)

//Ball and Wall Interactions

// Closest Point Between Ball and Wall
const closestItCanBe = (cap, ball) => {
  let angle = getAngle(cap, ball);
  const deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
  const deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);
  return { x: cap.x + deltaX, y: cap.y + deltaY };
}; //This function computes the closest position the ball can be to the wall without passing through.

// Roll the ball around the wall cap
const rollAroundCap = (cap, ball) => {
  let impactAngle = getAngle(ball, cap);
  let heading = getAngle(
    { x: 0, y: 0 },
    { x: ball.velocityX, y: ball.velocityY }
  );
  let impactHeadingAngle = impactAngle - heading;
  const velocityMagnitude = distance2D(
    { x: 0, y: 0 },
    { x: ball.velocityX, y: ball.velocityY }
  );

  const velocityMagnitudeDiagonalToTheImpact = Math.sin(impactHeadingAngle) * velocityMagnitude;
  const closestDistance = wallW / 2 + ballSize / 2;
  const rotationAngle = Math.atan(velocityMagnitudeDiagonalToTheImpact / closestDistance);

  const deltaFromCap = {
    x: Math.cos(impactAngle + Math.PI - rotationAngle) * closestDistance,
    y: Math.sin(impactAngle + Math.PI - rotationAngle) * closestDistance,
  };

  const x = ball.x;
  const y = ball.y;
  const velocityX = ball.x - (cap.x + deltaFromCap.x);
  const velocityY = ball.y - (cap.y + deltaFromCap.y);
  const nextX = x + velocityX;
  const nextY = y + velocityY;

  return { x, y, velocityX, velocityY, nextX, nextY };
};//When a ball hits the corner or cap of a wall, it will "roll" around it, changing its velocity
 //and position. This function calculates that effect, ensuring the ball bounces or rolls around
 //smoothly instead of getting stuck.

// Slowing the Ball
//Decreases the absolute value of a number but keeps it's sign, doesn't go below abs 0
const slow = (number, difference) => {
  if (Math.abs(number) <= difference) return 0;
  if (number > difference) return number - difference;
  return number + difference;
};

const mazeElement = document.getElementById("maze");

// Game State Variables
let hardMode = false;
let previousTimestamp;
let gameInProgress;
let mouseStartX;
let mouseStartY;
let accelerationX;
let accelerationY;
let frictionX;
let frictionY;

//Game Configuration
const pathW = 25; // Path width
const wallW = 10; // Wall width
const ballSize = 10; // Width and height of the ball
const holeSize = 18;
const debugMode = false;

let balls = [];
let ballElements = [];
let holeElements = [];

socket_to_ball_name = {};
socket_to_ball_id = {};
let currRoom;
let currID;
let numTimesErrorPlayed = 0;

let winner;

// Wall metadata
let mapData,
  walls,
  holes,
  plus_two_holes,
  plus_four_holes,
  reverse_holes,
  skip_holes;

//Socket.IO for Real-Time Multiplayer
socket.on("receieveMap", ({ map, room, column, row, roomCode }) => {
  mazeData = map;
  currRoom = roomCode;
  currID = socket.id;

  walls = mazeData.map((wall) => ({
    x: wall.column * (pathW + wallW),
    y: wall.row * (pathW + wallW),
    horizontal: wall.horizontal,
    length: wall.length * (pathW + wallW),
  }));

  // Draw walls
  walls.forEach(({ x, y, horizontal, length }) => {
    const wall = document.createElement("div");
    wall.setAttribute("class", "wall");
    wall.style.cssText = `
          left: ${x}px;
          top: ${y}px;
          width: ${wallW}px;
          height: ${length}px;
          transform: rotate(${horizontal ? -90 : 0}deg);
          `;
    mazeElement.appendChild(wall);
  });

  holes = [{ column: numRows / 2, row: numCols / 2 }].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
  }));

  holes.forEach(({ x, y }) => {
    const ball = document.createElement("div");
    ball.setAttribute("class", "black-hole");
    ball.style.cssText = `left: ${x}px; top: ${y}px;`;
    mazeElement.appendChild(ball);
    holeElements.push(ball);
  });

  plus_two_holes = [
    { column: Math.floor(column * numCols), row: Math.floor(row * numRows) },
  ].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
  }));

  plus_two_holes.forEach(({ x, y }) => {
    const hole = document.createElement("div");
    hole.setAttribute("class", "plus-two-hole");
    hole.style.cssText = `left: ${x}px; top: ${y}px;`;
    mazeElement.appendChild(hole);
    holeElements.push(hole);
  });

  plus_four_holes = [
    { column: Math.floor(row * numRows), row: Math.floor(column * numCols) },
  ].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
  }));

  plus_four_holes.forEach(({ x, y }) => {
    const hole = document.createElement("div");
    hole.setAttribute("class", "plus-four-hole");
    hole.style.cssText = `left: ${x}px; top: ${y}px;`;
    mazeElement.appendChild(hole);
    holeElements.push(hole);
  });

  reverse_holes = [
    {
      column: Math.floor((row * numRows) / 2),
      row: Math.floor((column * numCols) / 3),
    },
  ].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
  }));

  reverse_holes.forEach(({ x, y }) => {
    const hole = document.createElement("div");
    hole.setAttribute("class", "reverse-hole");
    hole.style.cssText = `left: ${x}px; top: ${y}px;`;
    mazeElement.appendChild(hole);
    holeElements.push(hole);
  });

  skip_holes = [
    {
      column: Math.floor((row * numRows) / 3),
      row: Math.floor((column * numCols) / 2),
    },
  ].map((hole) => ({
    x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
  }));

  skip_holes.forEach(({ x, y }) => {
    const hole = document.createElement("div");
    hole.setAttribute("class", "skip-hole");
    hole.style.cssText = `left: ${x}px; top: ${y}px;`;
    mazeElement.appendChild(hole);
    holeElements.push(hole);
  });

  resetGame(room);
  balls.forEach(({ x, y }, index) => {
    const ball = document.createElement("div");
    ball.setAttribute("class", "ball");
    ball.style.cssText = `left: ${x}px; top: ${y}px; background-color: ${colors[index]}`;
    const id = room.players[index].id;
    ball.id = `ball-${id}`;
    mazeElement.appendChild(ball);
    ballElements.push(ball);

    const name = room.players[index].name;

    socket_to_ball_name[index] = name;
    socket_to_ball_id[index] = id;
  });
});

//Handling Ball Movement with Gyroscope Data
socket.on("updateBall", ({ data, host }) => {
  if (data === null) {
    console.log("no data");
    return;
  }
  if (!gameInProgress) {
    gameInProgress = true;
    window.requestAnimationFrame(main);
  }

  //console.log(host)
  const rotationY = Math.minmax(data.gamma, 12); // Left to right tilt
  const rotationX = Math.minmax(data.beta, 12); // Front to back tilt
  const gravity = 1;
  const friction = 0.01;
  accelerationX = gravity * Math.sin((rotationY / 180) * Math.PI);
  accelerationY = gravity * Math.sin((rotationX / 180) * Math.PI);
  frictionX = gravity * Math.cos((rotationY / 180) * Math.PI) * friction;
  frictionY = gravity * Math.cos((rotationX / 180) * Math.PI) * friction;

  // if (host) {
  mazeElement.style.cssText = `
          transform: rotateY(${rotationY}deg) rotateX(${-rotationX}deg)
        `;
  // }

  const playerElement = document.getElementById(`player-res`);
  if (!playerElement) {
    const text = document.createElement("div");
    text.id = "res";

    const newPlayerElement = document.createElement("div");
    newPlayerElement.id = `player-res`;
    newPlayerElement.classList.add("garden");

    const ball = document.createElement("div");
    ball.id = `player-res-ball`;
    ball.classList.add("ball");

    document.getElementById("gyroscope-data").appendChild(newPlayerElement);
    document.getElementById(`player-res`).appendChild(ball);
    document.getElementById(`player-res`).appendChild(text);
  }

  updateThing(
    document.getElementById(`player-res`),
    document.getElementById(`player-res-ball`),
    data.beta,
    data.gamma
  );
});

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

//Resetting the Game
function resetGame(room) {
  previousTimestamp = undefined;
  gameInProgress = false;
  mouseStartX = undefined;
  mouseStartY = undefined;
  accelerationX = undefined;
  accelerationY = undefined;
  frictionX = undefined;
  frictionY = undefined;

  mazeElement.style.cssText = `
        transform: rotateY(0deg) rotateX(0deg)
      `;

  constantBalls = [
    { column: 0, row: 0 },
    { column: 0, row: 9 },
    { column: 9, row: 0 },
    { column: 9, row: 9 },
  ];

  let playerBalls = [];

  for (let i = 0; i < room.players.length; i++) {
    playerBalls.push(constantBalls[i]);
  }

  balls = playerBalls.map((ball) => ({
    x: ball.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
    y: ball.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
    velocityX: 0,
    velocityY: 0,
  }));

  if (ballElements.length) {
    balls.forEach(({ x, y }, index) => {
      ballElements[
        index
      ].style.cssText = `left: ${x}px; top: ${y}px; background-color: ${colors[index]}`;
      ballElements[index].id = `ball-${room.players[index]}`;
    });
  }
}

// Add event listeners for arrow key presses
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') {
      key = 'ArrowUp';
 } else if (event.key === 'ArrowDown') {
    key = 'ArrowDown';
  } else if (event.key === 'ArrowLeft') {
    key = 'ArrowLeft';
  } else if (event.key === 'ArrowRight') {
    key = 'ArrowRight';
  }
});

document.addEventListener('keyup', () => {
  key = null;
});

function main(timestamp) {
  // It is possible to reset the game mid-game. This case the look should stop

  if (!gameInProgress) return;

  if (previousTimestamp === undefined) {
    previousTimestamp = timestamp;
    window.requestAnimationFrame(main);
    return;
  }

  const maxVelocity = 1.5;

  // Time passed since last cycle divided by 16
  // This function gets called every 16 ms on average so dividing by 16 will result in 1
  const timeElapsed = (timestamp - previousTimestamp) / 16;

  try {
    index = 0;
    // If mouse didn't move yet don't do anything
    if (accelerationX != undefined && accelerationY != undefined) {
      const velocityChangeX = accelerationX * timeElapsed;
      const velocityChangeY = accelerationY * timeElapsed;
      const frictionDeltaX = frictionX * timeElapsed;
      const frictionDeltaY = frictionY * timeElapsed;

      balls.forEach((ball) => {
        if (velocityChangeX == 0) {
          // No rotation, the plane is flat
          // On flat surface friction can only slow down, but not reverse movement
          ball.velocityX = slow(ball.velocityX, frictionDeltaX);
        } else {
          ball.velocityX = ball.velocityX + velocityChangeX;
          ball.velocityX = Math.max(Math.min(ball.velocityX, 1.5), -1.5);
          ball.velocityX =
            ball.velocityX - Math.sign(velocityChangeX) * frictionDeltaX;
          ball.velocityX = Math.minmax(ball.velocityX, maxVelocity);
        }

        if (velocityChangeY == 0) {
          // No rotation, the plane is flat
          // On flat surface friction can only slow down, but not reverse movement
          ball.velocityY = slow(ball.velocityY, frictionDeltaY);
        } else {
          ball.velocityY = ball.velocityY + velocityChangeY;
          ball.velocityY =
            ball.velocityY - Math.sign(velocityChangeY) * frictionDeltaY;
          ball.velocityY = Math.minmax(ball.velocityY, maxVelocity);
        }

        // Preliminary next ball position, only becomes true if no hit occurs
        // Used only for hit testing, does not mean that the ball will reach this position
        ball.nextX = ball.x + ball.velocityX;
        ball.nextY = ball.y + ball.velocityY;

        if (debugMode) console.log("tick", ball);

        walls.forEach((wall, wi) => {
          if (wall.horizontal) {
            // Horizontal wall

            if (
              ball.nextY + ballSize / 2 >= wall.y - wallW / 2 &&
              ball.nextY - ballSize / 2 <= wall.y + wallW / 2
            ) {
              // Ball got within the strip of the wall
              // (not necessarily hit it, could be before or after)

              const wallStart = {
                x: wall.x,
                y: wall.y,
              };
              const wallEnd = {
                x: wall.x + wall.length,
                y: wall.y,
              };

              if (
                ball.nextX + ballSize / 2 >= wallStart.x - wallW / 2 &&
                ball.nextX < wallStart.x
              ) {
                // Ball might hit the left cap of a horizontal wall
                const distance = distance2D(wallStart, {
                  x: ball.nextX,
                  y: ball.nextY,
                });
                if (distance < ballSize / 2 + wallW / 2) {
                  if (debugMode && wi > 4)
                    console.warn("too close h head", distance, ball);

                  // Ball hits the left cap of a horizontal wall
                  const closest = closestItCanBe(wallStart, {
                    x: ball.nextX,
                    y: ball.nextY,
                  });
                  const rolled = rollAroundCap(wallStart, {
                    x: closest.x,
                    y: closest.y,
                    velocityX: ball.velocityX,
                    velocityY: ball.velocityY,
                  });

                  Object.assign(ball, rolled);
                }
              }

              if (
                ball.nextX - ballSize / 2 <= wallEnd.x + wallW / 2 &&
                ball.nextX > wallEnd.x
              ) {
                // Ball might hit the right cap of a horizontal wall
                const distance = distance2D(wallEnd, {
                  x: ball.nextX,
                  y: ball.nextY,
                });
                if (distance < ballSize / 2 + wallW / 2) {
                  if (debugMode && wi > 4)
                    console.warn("too close h tail", distance, ball);

                  // Ball hits the right cap of a horizontal wall
                  const closest = closestItCanBe(wallEnd, {
                    x: ball.nextX,
                    y: ball.nextY,
                  });
                  const rolled = rollAroundCap(wallEnd, {
                    x: closest.x,
                    y: closest.y,
                    velocityX: ball.velocityX,
                    velocityY: ball.velocityY,
                  });

                  Object.assign(ball, rolled);
                }
              }

              if (ball.nextX >= wallStart.x && ball.nextX <= wallEnd.x) {
                // The ball got inside the main body of the wall
                if (ball.nextY < wall.y) {
                  // Hit horizontal wall from top
                  ball.nextY = wall.y - wallW / 2 - ballSize / 2;
                } else {
                  // Hit horizontal wall from bottom
                  ball.nextY = wall.y + wallW / 2 + ballSize / 2;
                }
                ball.y = ball.nextY;
                ball.velocityY = -ball.velocityY / 3;

                if (debugMode && wi > 4)
                  console.error("crossing h line, HIT", ball);
              }
            }
          } else {
            // Vertical wall

            if (
              ball.nextX + ballSize / 2 >= wall.x - wallW / 2 &&
              ball.nextX - ballSize / 2 <= wall.x + wallW / 2
            ) {
              // Ball got within the strip of the wall
              // (not necessarily hit it, could be before or after)

              const wallStart = {
                x: wall.x,
                y: wall.y,
              };
              const wallEnd = {
                x: wall.x,
                y: wall.y + wall.length,
              };

              if (
                ball.nextY + ballSize / 2 >= wallStart.y - wallW / 2 &&
                ball.nextY < wallStart.y
              ) {
                // Ball might hit the top cap of a horizontal wall
                const distance = distance2D(wallStart, {
                  x: ball.nextX,
                  y: ball.nextY,
                });
                if (distance < ballSize / 2 + wallW / 2) {
                  if (debugMode && wi > 4)
                    console.warn("too close v head", distance, ball);

                  // Ball hits the left cap of a horizontal wall
                  const closest = closestItCanBe(wallStart, {
                    x: ball.nextX,
                    y: ball.nextY,
                  });
                  const rolled = rollAroundCap(wallStart, {
                    x: closest.x,
                    y: closest.y,
                    velocityX: ball.velocityX,
                    velocityY: ball.velocityY,
                  });

                  Object.assign(ball, rolled);
                }
              }

              if (
                ball.nextY - ballSize / 2 <= wallEnd.y + wallW / 2 &&
                ball.nextY > wallEnd.y
              ) {
                // Ball might hit the bottom cap of a horizontal wall
                const distance = distance2D(wallEnd, {
                  x: ball.nextX,
                  y: ball.nextY,
                });
                if (distance < ballSize / 2 + wallW / 2) {
                  if (debugMode && wi > 4)
                    console.warn("too close v tail", distance, ball);

                  // Ball hits the right cap of a horizontal wall
                  const closest = closestItCanBe(wallEnd, {
                    x: ball.nextX,
                    y: ball.nextY,
                  });
                  const rolled = rollAroundCap(wallEnd, {
                    x: closest.x,
                    y: closest.y,
                    velocityX: ball.velocityX,
                    velocityY: ball.velocityY,
                  });

                  Object.assign(ball, rolled);
                }
              }

              if (ball.nextY >= wallStart.y && ball.nextY <= wallEnd.y) {
                // The ball got inside the main body of the wall
                if (ball.nextX < wall.x) {
                  // Hit vertical wall from left
                  ball.nextX = wall.x - wallW / 2 - ballSize / 2;
                } else {
                  // Hit vertical wall from right
                  ball.nextX = wall.x + wallW / 2 + ballSize / 2;
                }
                ball.x = ball.nextX;
                ball.velocityX = -ball.velocityX / 3;

                if (debugMode && wi > 4)
                  console.error("crossing v line, HIT", ball);
              }
            }
          }
        }

        );

        holes.forEach((hole, hi) => {
          const distance = distance2D(hole, {
            x: ball.nextX,
            y: ball.nextY,
          });

          if (distance <= holeSize / 2) {
            // The ball fell into a hole
            holeElements[hi].style.backgroundColor = "green";
            document.getElementById("game-start-title").textContent =
              "Winner:" + socket_to_ball_name[index];

            const id = socket_to_ball_id[index];
            winner = id;
            gameInProgress = false;
            throw Error("Game over");
          }
        });

//powerups
        plus_two_holes.forEach((hole, hi) => {
          const distance = distance2D(hole, {
            x: ball.nextX,
            y: ball.nextY,
          });

          if (distance <= holeSize / 2) {
            ball.velocityX = slow(ball.velocityX, 0.1);
            ball.velocityY = slow(ball.velocityY, 0.1);
          }
        });

        plus_four_holes.forEach((hole, hi) => {
          const distance = distance2D(hole, {
            x: ball.nextX,
            y: ball.nextY,
          });

          if (distance <= holeSize / 2) {
            ball.velocityX = slow(ball.velocityX, 0.5);
            ball.velocityY = slow(ball.velocityY, 0.5);
          }
        });

        reverse_holes.forEach((hole, hi) => {
          const distance = distance2D(hole, {
            x: ball.nextX,
            y: ball.nextY,
          });

          if (distance <= holeSize / 2) {
                      ball.velocityX = 0;
                      ball.velocityY = 0;
          }
        });

        skip_holes.forEach((hole, hi) => {
          const distance = distance2D(hole, {
            x: ball.nextX,
            y: ball.nextY,
          });

          if (distance <= holeSize / 2) {
            ball.velocityX = 0;
            ball.velocityY = 0;
          }
        });

        if (key === 'ArrowUp') {
                 ball.velocityY = Math.max(ball.velocityY - 0.25, -maxVelocity);
                } else if (key === 'ArrowDown') {
                  ball.velocityY = Math.min(ball.velocityY + 0.25, maxVelocity);
                } else if (key === 'ArrowLeft') {
                  ball.velocityX = Math.max(ball.velocityX - 0.25, -maxVelocity);
                } else if (key === 'ArrowRight') {
                  ball.velocityX = Math.min(ball.velocityX + 0.25, maxVelocity);
                }

        // Adjust ball metadata
        ball.x = ball.x + ball.velocityX;
        ball.y = ball.y + ball.velocityY;
      });

      // Move balls to their new position on the UI
      balls.forEach(({ x, y }, index) => {
        ballElements[
          index
        ].style.cssText = `left: ${x}px; top: ${y}px; background-color: ${colors[index]}`;
      });

      index++;
      previousTimestamp = timestamp;
      window.requestAnimationFrame(main);
    }
  } catch (error) {
    if (error.message == "Game over") {
      if (winner !== currID && numTimesErrorPlayed == 0) {
        var audio = new Audio("audio/downer_noise.mp3");
        audio.play();
        numTimesErrorPlayed += 1;

        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.6, x: 0.2 },
        });

        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.4, x: 0.4 },
        });

        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.6, x: 0.7 },
        });

        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.9, x: 0.5 },
        });
      }
    } else throw error;
  }
}


