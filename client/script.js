document.addEventListener('DOMContentLoaded', () => {
	// --- DOM Elements ---
	const canvas = document.getElementById('game-canvas');
	const ctx = canvas.getContext('2d');
	const scoreDisplay = document.getElementById('score');
	const localHighScoreDisplay = document.getElementById('local-high-score'); // Updated ID ref
	const nicknameDisplay = document.getElementById('nickname');

	// Overlays and Screens
	const startScreen = document.getElementById('start-screen');
	const countdownOverlay = document.getElementById('countdown-overlay');
	const countdownDisplay = document.getElementById('countdown-display');
	const gameOverScreen = document.getElementById('game-over-screen');

	// Start Screen Elements
	const startButton = document.getElementById('start-button');

	// Game Over Screen Elements
	const finalScoreDisplay = document.getElementById('final-score');
	const goNicknameDisplay = document.getElementById('go-nickname-display');
	const regenerateNicknameButton = document.getElementById('regenerate-nickname');
	const submitScoreButton = document.getElementById('submit-score-button');
	const submitStatusDisplay = document.getElementById('submit-status');
	const leaderboardList = document.getElementById('leaderboard-list');
	const restartButton = document.getElementById('restart-button');

	// Control Buttons
	const btnUp = document.getElementById('btn-up');
	const btnDown = document.getElementById('btn-down');
	const btnLeft = document.getElementById('btn-left');
	const btnRight = document.getElementById('btn-right');

	// --- Game Constants & Variables ---
	const SERVER_URL = 'http://localhost:53330'; // Adjust if needed
	let gridSize;
	let tileCountX, tileCountY;
	const gameSpeed = 150; // ms

	// Game State
	let snake;
	let food;
	let dx, dy;
	let score;
	let changingDirection;
	let gameRunning = false; // Start with game not running
	let gameLoopTimeout;
	let isFirstGame = true; // Requirement 1

	// Player Data (Requirement 3 & 2.1.2)
	let nickname = localStorage.getItem('ancientSerpentNickname') || null; // Load nickname
	let localHighScore = localStorage.getItem('ancientSerpentHighScore') || 0; // Load local high score

	// --- Nickname Generation Data ---
	const actions = ["Sleeping", "Dancing", "Jumping", "Running", "Flying", "Swimming", "Singing", "Reading", "Drawing", "Painting", "Fishing", "Hiking", "Baking", "Cooking", "Eating", "Dreaming", "Winking", "Smiling", "Laughing", "Floating", "Hopping", "Skipping", "Waving", "Hugging", "Cuddling", "Napping", "Stargazing", "Sipping", "Munching", "Playing"];
	const colors = ["Pink", "Blue", "Green", "Yellow", "Purple", "Orange", "Mint", "Peach", "Lavender", "Coral"];
	const cuteThings = ["Bunny", "Kitten", "Puppy", "Panda", "Bear", "Fox", "Hedgehog", "Piggy", "Duckling", "Lamb", "Owl", "Chipmunk", "Hamster", "Penguin", "Koala", "Cupcake", "Muffin", "Cookie", "Donut", "Macaron", "Pudding", "Brownie", "Cheesecake", "Mochi", "Eclair", "Waffle", "Pancake", "Sundae", "Marshmallow", "Jellybean"];

	// --- Utility Functions ---
	function randomNum(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function generateNickname() {
		const action = actions[randomNum(0, actions.length - 1)];
		const color = colors[randomNum(0, colors.length - 1)];
		const thing = cuteThings[randomNum(0, cuteThings.length - 1)];
		return `${action} ${color} ${thing}`;
	}

	function resizeCanvas() {
		const baseGridSize = 20;
		const containerWidth = canvas.clientWidth; // Use clientWidth for responsive calculation
		const aspectRatio = 1 / 1.2; // From CSS

		canvas.width = Math.floor(containerWidth / baseGridSize) * baseGridSize;
		// Calculate height based on aspect ratio derived from CSS, then snap to grid
		canvas.height = Math.floor((canvas.width * (1 / aspectRatio)) / baseGridSize) * baseGridSize;

		gridSize = baseGridSize;
		tileCountX = canvas.width / gridSize;
		tileCountY = canvas.height / gridSize;

		// Avoid redrawing if game isn't active or overlays are shown
		if (gameRunning) {
			clearCanvas();
			drawFood();
			drawSnake();
		} else if (!startScreen.style.display || startScreen.style.display === 'none') {
			clearCanvas(); // Clear if game area is visible but not running
		}
	}

	// --- Drawing Functions (Mostly Unchanged) ---
	function clearCanvas() {
		ctx.fillStyle = '#c19a6b';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	function drawRect(x, y, color, borderColor = '#5a3a22', isFood = false) {
		ctx.fillStyle = color;
		ctx.strokeStyle = borderColor;
		ctx.lineWidth = 1;
		const offset = gridSize * 0.1;
		ctx.beginPath();
		if (isFood) {
			ctx.roundRect(x * gridSize + offset, y * gridSize + offset, gridSize - offset * 2, gridSize - offset * 2, gridSize * 0.3);
		} else {
			ctx.roundRect(x * gridSize + 1, y * gridSize + 1, gridSize - 2, gridSize - 2, gridSize * 0.15);
		}
		ctx.fill();
		ctx.stroke();
	}

	function drawSnake() {
		snake.forEach((segment, index) => {
			const color = index === 0 ? '#4a2a12' : '#6b4f3a';
			drawRect(segment.x, segment.y, color);
		});
	}

	function drawFood() {
		if (food.x !== -1) { // Only draw if food exists
			drawRect(food.x, food.y, '#a0522d', '#5a3a22', true);
		}
	}

	// --- Game Logic (Mostly Unchanged) ---
	function moveSnake() {
		if (!gameRunning) return; // Extra safety check
		const head = { x: snake[0].x + dx, y: snake[0].y + dy };
		snake.unshift(head);

		if (head.x === food.x && head.y === food.y) {
			score += 10;
			updateScoreDisplay();
			generateFood();
		} else {
			snake.pop();
		}
	}

	function generateFood() {
		let newFood;
		while (true) {
			newFood = {
				x: randomNum(0, tileCountX - 1),
				y: randomNum(0, tileCountY - 1)
			};
			let collision = false;
			for (const segment of snake) {
				if (segment.x === newFood.x && segment.y === newFood.y) {
					collision = true;
					break;
				}
			}
			if (!collision) {
				food = newFood; // Assign valid food position
				break;
			}
		}
	}

	function checkCollision() {
		const head = snake[0];
		if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) return true; // Wall
		for (let i = 1; i < snake.length; i++) { // Self
			if (head.x === snake[i].x && head.y === snake[i].y) return true;
		}
		return false;
	}

	function changeDirection(event, key) {
		if (!gameRunning || changingDirection) return;
		const keyPressed = key || event.key;
		const goingUp = dy === -1;
		const goingDown = dy === 1;
		const goingLeft = dx === -1;
		const goingRight = dx === 1;
		let directionChanged = false;

		if ((keyPressed === 'ArrowUp' || keyPressed === 'w' || keyPressed === 'up') && !goingDown) { dx = 0; dy = -1; directionChanged = true; }
		else if ((keyPressed === 'ArrowDown' || keyPressed === 's' || keyPressed === 'down') && !goingUp) { dx = 0; dy = 1; directionChanged = true; }
		else if ((keyPressed === 'ArrowLeft' || keyPressed === 'a' || keyPressed === 'left') && !goingRight) { dx = -1; dy = 0; directionChanged = true; }
		else if ((keyPressed === 'ArrowRight' || keyPressed === 'd' || keyPressed === 'right') && !goingLeft) { dx = 1; dy = 0; directionChanged = true; }

		if (directionChanged) {
			changingDirection = true;
		}
	}

	// --- UI Update Functions ---
	function updateScoreDisplay() {
		scoreDisplay.textContent = score;
	}

	function updateLocalHighScoreDisplay() {
		localHighScoreDisplay.textContent = localHighScore;
	}

	function updateNicknameDisplay() {
		const displayNick = nickname || 'Generating...';
		nicknameDisplay.textContent = displayNick;
		nicknameDisplay.title = displayNick; // Update title attribute
	}

	function updateGoNicknameDisplay() {
		goNicknameDisplay.textContent = nickname;
		goNicknameDisplay.title = nickname; // Set title on game over screen display
	}

	function updateLocalHighScore() {
		if (score > localHighScore) {
			localHighScore = score;
			localStorage.setItem('ancientSerpentHighScore', localHighScore);
			updateLocalHighScoreDisplay();
		}
	}

	// --- API & Leaderboard Functions ---
	async function submitScoreToServer(nick, finalScore) {
		console.log(`Submitting score: ${nick}, ${finalScore}`);
		submitStatusDisplay.textContent = 'Submitting...';
		submitStatusDisplay.classList.remove('error');
		submitScoreButton.disabled = true; // Disable while submitting
		regenerateNicknameButton.disabled = true;

		try {
			const response = await fetch(`${SERVER_URL}/api/scores`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nickname: nick, score: finalScore }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Submission failed');
			}

			const result = await response.json();
			console.log('Score submitted successfully:', result);
			submitStatusDisplay.textContent = 'Submitted!';
			localStorage.setItem('ancientSerpentNickname', nick); // Save submitted nickname (Requirement 2.1.2)
			restartButton.disabled = false; // Enable restart after successful submit (Requirement 2.1.2)
			// Keep submit/regenerate disabled

		} catch (error) {
			console.error('Error submitting score:', error);
			submitStatusDisplay.textContent = `Error: ${error.message}`;
			submitStatusDisplay.classList.add('error');
			// Re-enable buttons to allow retry or nickname change
			submitScoreButton.disabled = false;
			regenerateNicknameButton.disabled = false;
			// Keep restart disabled until score is submitted
			restartButton.disabled = true;
		}
	}

	async function fetchAndDisplayLeaderboard() {
		leaderboardList.innerHTML = '<li class="status-message">Loading...</li>';
		try {
			const response = await fetch(`${SERVER_URL}/api/leaderboard`);
			if (!response.ok) throw new Error('Failed to fetch leaderboard');

			const data = await response.json();
			leaderboardList.innerHTML = '';

			if (data.top10 && data.top10.length > 0) {
				data.top10.forEach((entry, index) => { // Index is still useful if needed elsewhere, but not for numbering
					const li = document.createElement('li');

					// Sanitize nickname display (simple example)
					const safeNickname = entry.nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");

					li.innerHTML = `
                         <span class="nick" title="${safeNickname}">${safeNickname}</span>
                         <span class="date">${entry.timestamp || 'N/A'}</span>
                         <span class="score">${entry.score}</span>
                     `;
					// Add a title attribute to the nickname span in the list too
					const nickSpan = li.querySelector('.nick');
					if (nickSpan) nickSpan.title = entry.nickname; // Show full name on hover in list

					leaderboardList.appendChild(li);
				});
			} else {
				leaderboardList.innerHTML = '<li class="status-message">Leaderboard is empty.</li>';
			}
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
			leaderboardList.innerHTML = `<li class="status-message error">Error loading leaderboard.</li>`;
		}
	}

	// --- Game Flow Functions ---

	function showStartScreen() {
		clearCanvas(); // Clear game area behind overlay
		startScreen.style.display = 'flex';
		countdownOverlay.style.display = 'none';
		gameOverScreen.style.display = 'none';
	}

	function startCountdown(callback) {
		startScreen.style.display = 'none'; // Hide start if visible
		gameOverScreen.style.display = 'none'; // Hide game over if visible
		countdownOverlay.style.display = 'flex';
		let count = 3;
		countdownDisplay.textContent = count;

		const interval = setInterval(() => {
			count--;
			if (count > 0) {
				countdownDisplay.textContent = count;
			} else {
				clearInterval(interval);
				countdownOverlay.style.display = 'none';
				callback(); // Execute the next step (start game)
			}
		}, 1000); // 1 second interval
	}

	function setupNewGame() {
		resizeCanvas(); // Ensure canvas is sized correctly before starting
		score = 0;
		updateScoreDisplay();
		snake = [ // Reset snake position
			{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) },
			{ x: Math.floor(tileCountX / 2) - 1, y: Math.floor(tileCountY / 2) },
			{ x: Math.floor(tileCountX / 2) - 2, y: Math.floor(tileCountY / 2) },
		];
		food = { x: -1, y: -1 }; // Reset food
		dx = 1; dy = 0; // Start moving right
		changingDirection = false;
		gameRunning = true;

		generateFood(); // Place initial food
		clearCanvas(); // Initial draw
		drawFood();
		drawSnake();

		clearTimeout(gameLoopTimeout); // Clear any previous loop
		mainGameLoop(); // Start the actual game loop
	}


	function mainGameLoop() {
		if (!gameRunning) return;

		gameLoopTimeout = setTimeout(() => {
			changingDirection = false;
			clearCanvas();
			drawFood();
			moveSnake();

			if (checkCollision()) {
				triggerGameOver();
			} else {
				drawSnake();
				mainGameLoop(); // Continue loop
			}
		}, gameSpeed);
	}


	function triggerGameOver() {
		gameRunning = false;
		clearTimeout(gameLoopTimeout);
		updateLocalHighScore(); // Update local high score immediately

		// Populate Game Over screen before showing
		finalScoreDisplay.textContent = score;

		updateGoNicknameDisplay(); // <<< ADD THIS CALL to set nickname text & title

		submitStatusDisplay.textContent = ''; // Clear previous status
		submitStatusDisplay.classList.remove('error');

		// Update button content and states
		regenerateNicknameButton.textContent = '🔄'; // Set button text to refresh icon
		regenerateNicknameButton.disabled = false;
		submitScoreButton.disabled = false;
		restartButton.disabled = true;

		gameOverScreen.style.display = 'flex'; // Show the screen
		fetchAndDisplayLeaderboard(); // Fetch leaderboard data
	}

	// --- Event Listeners ---

	// Initial Start Button
	startButton.addEventListener('click', () => {
		isFirstGame = false;
		startCountdown(setupNewGame); // Countdown then setup
	});

	// Restart Button (on Game Over screen)
	restartButton.addEventListener('click', () => {
		// Restart directly starts countdown (Requirement 1.1)
		startCountdown(setupNewGame);
	});

	// Regenerate Nickname Button (on Game Over screen)
	regenerateNicknameButton.addEventListener('click', () => {
		if (regenerateNicknameButton.disabled) return; // Prevent action if disabled
	
		nickname = generateNickname(); // Generate new one
	
		updateGoNicknameDisplay(); // <<< ADD THIS CALL to update nickname text & title
	
		updateNicknameDisplay(); // Also update the main game UI display in background if needed
		// Do NOT save to localStorage here, only after submit
	});

	// Submit Score Button (on Game Over screen)
	submitScoreButton.addEventListener('click', () => {
		submitScoreToServer(nickname, score);
	});

	// Keyboard Controls
	document.addEventListener('keydown', changeDirection);

	// Touch Controls
	btnUp.addEventListener('click', () => changeDirection(null, 'up'));
	btnDown.addEventListener('click', () => changeDirection(null, 'down'));
	btnLeft.addEventListener('click', () => changeDirection(null, 'left'));
	btnRight.addEventListener('click', () => changeDirection(null, 'right'));

	// Window Resize Handling (simplified - pause/prompt restart)
	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			console.log("Resizing canvas...");
			const wasRunning = gameRunning;
			if (wasRunning) {
				gameRunning = false; // Pause game
				clearTimeout(gameLoopTimeout);
				console.warn("Game paused due to resize. Restart might be needed.");
				// Optionally show a message or force game over / restart prompt
			}
			resizeCanvas(); // Resize the canvas visually
			// For simplicity, we won't automatically restart the game loop here.
			// If the game was running, it's now paused.

		}, 250);
	});


	// --- Initial Page Load Setup ---
	function initializeApp() {
		console.log("Initializing App...");
		if (!nickname) {
			nickname = generateNickname();
		}
		updateNicknameDisplay();
		nicknameDisplay.title = nickname; // Add title to main display too
		updateLocalHighScoreDisplay();
		resizeCanvas();
		showStartScreen();
	}

	initializeApp(); // Run initial setup

}); // End DOMContentLoaded