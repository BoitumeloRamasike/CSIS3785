
  const container = document.getElementById("container");
  const ball = document.getElementById("ball");
  const containerRadius = container.offsetWidth / 2;
  const ballRadius = ball.offsetWidth / 2;
  const maxOffset = containerRadius - ballRadius;

  let x = 0,
    y = 0; // Ball's position
  let vx = 0,
    vy = 0; // Ball's velocity

// Handle device orientation for ball movement
  function handleOrientation(event) {
    const beta = event.beta; // In degree in the range [-180,180)
    const gamma = event.gamma; // In degree in the range [-90,90)

    // Normalize the values
    const ax = gamma / 90; // Normalize to range [-1,1]
    const ay = beta / 90; // Normalize to range [-1,1]

    // Update velocity
    vx += ax * 0.5; // Adjust multiplier for acceleration
    vy += ay * 0.5; // Adjust multiplier for acceleration
  }

// Update ball position based on velocity
  function updatePosition() {
    // Update position
    x += vx;
    y += vy;

     // Set boundaries so the ball doesn't go out of the container
    const distance = Math.sqrt(x * x + y * y);
    if (distance > maxOffset) {
      const angle = Math.atan2(y, x);
      x = maxOffset * Math.cos(angle);
      y = maxOffset * Math.sin(angle);

      // Stop velocity on boundary hit
      vx = 0;
      vy = 0;
    }

    ball.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

    requestAnimationFrame(updatePosition);
  }

  window.addEventListener("deviceorientation", handleOrientation);
  requestAnimationFrame(updatePosition);
