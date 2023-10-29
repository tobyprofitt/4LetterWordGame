let startWord = "";  // Filled by the server
let endWord = "";    // Filled by the server
let currentDifficulty = "easy"; // or initialize with a default value if necessary
let medium_available = false;
let hard_available = false;
let easy_score = 0;
let medium_score = 0;
let hard_score = 0;
let currentDate = new Date().toISOString().slice(0,10); // YYYY-MM-DD format

document.getElementById("user-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitWord();
    }
});

function clearBoard() {
    for (let i = 1; i <= 4; i++) {
        document.getElementById("start-letter-" + i).textContent = "";
        document.getElementById("end-letter-" + i).textContent = "";
    }
    let gameBoard = document.getElementById("game-board");
    let historyRows = gameBoard.querySelectorAll(".word-row:not(#start-word-row, #input-word-row, #end-word-row)");
    for (let row of historyRows) {
        gameBoard.removeChild(row);
    }
    gameBoard.classList.remove("win-effect");
    document.getElementById("score").textContent = 0;
    document.getElementById("user-input").disabled = false;
    /* Drop the restart prompt */
    let restartPrompt = document.getElementById("restart-prompt");
    if (restartPrompt) {
        document.body.removeChild(restartPrompt);
    }
    /* Hide the shortest paths section */
    document.getElementById("shortest-paths").style.display = "none";
    /* Hide the share section */
    document.getElementById("share-score").style.display = "none";
}

function initializeGame(difficulty="easy") {
    if (difficulty === "easy") {
        medium_available = false;
        hard_available = false;
    } else if (difficulty === "medium") {
        hard_available = false;
    }
    console.log("initializeGame called");
    clearBoard();
    fetch(`/initialize-game?difficulty=${difficulty}&date=${currentDate}`)
    .then(response => response.json())
    .then(data => {
        startWord = data.startWord;
        endWord = data.endWord;

        // Populate starting and ending word squares
        populateWordSquares("start-letter-", startWord);
        populateWordSquares("end-letter-", endWord);
    });
    console.log("initializeGame finished");
}

// Function to reset all difficulty button states to default
function resetDifficultyButtons() {
    document.getElementById("easy").classList.remove("active", "completed");
    document.getElementById("medium").classList.remove("active", "completed");
    document.getElementById("hard").classList.remove("active", "completed");
}

// Function to update the button state based on the current difficulty
function updateDifficultyButtonState(difficulty) {
    resetDifficultyButtons();
    
    if (difficulty === "easy") {
        document.getElementById("easy").classList.add("active");
    } else if (difficulty === "medium") {
        document.getElementById("easy").classList.add("completed");
        document.getElementById("medium").classList.add("active");
    } else if (difficulty === "hard") {
        document.getElementById("easy").classList.add("completed");
        document.getElementById("medium").classList.add("completed");
        document.getElementById("hard").classList.add("active");
    }
}

function populateWordSquares(prefix, word) {
    for (let i = 0; i < word.length; i++) {
        document.getElementById(prefix + (i + 1)).textContent = word[i];
    }
}

function addGuessToHistory(guess) {
    let gameBoard = document.getElementById("game-board");
    let newRow = document.createElement("div");
    newRow.className = "word-row";

    for (let i = 0; i < guess.length; i++) {
        let letterBox = document.createElement("div");
        letterBox.className = "letter-box";
        letterBox.textContent = guess[i];
        newRow.appendChild(letterBox);
    }

    // Insert the new history row just above the input word row
    gameBoard.insertBefore(newRow, document.getElementById("input-word-row"));
}

function undoLastMove() {
    let gameBoard = document.getElementById("game-board");
    let historyRows = gameBoard.querySelectorAll(".word-row:not(#start-word-row, #input-word-row, #end-word-row)");
    let lastHistoryRow = historyRows[historyRows.length - 1];
    
    // Only allow undo if there's any history
    if (lastHistoryRow) {
        // Remove the last history row
        gameBoard.removeChild(lastHistoryRow);

        // Clear the input squares
        for (let i = 1; i <= 4; i++) {
            document.getElementById("input-letter-" + i).textContent = "";
        }

        // Decrement the score
        let currentScore = parseInt(document.getElementById("score").textContent);
        document.getElementById("score").textContent = currentScore - 1;

        // Send an "Undo" request to the backend
        fetch('/undo-move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}

function submitWord() {
    let userInput = document.getElementById("user-input").value.toUpperCase();
    let currentScore = parseInt(document.getElementById("score").textContent);
    let errorMessage = document.getElementById("error-message");
    let inputWordRow = document.getElementById("input-word-row");

    // Send the userInput and currentScore to the server for validation
    fetch('/play-move', {
        method: 'POST',
        body: JSON.stringify({
            'move': userInput,
            'score': currentScore
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.valid) {
            // Hide any previous error message
            errorMessage.style.display = "none";

            // Add the userInput to the history
            addGuessToHistory(userInput);

            // Clear the input squares for the next guess
            for (let i = 1; i <= 4; i++) {
                document.getElementById("input-letter-" + i).textContent = "";
            }

            document.getElementById("score").textContent = data.score;
            document.getElementById("user-input").value = "";  // Clear the input

        // Check if user reached the target word
        if (userInput === endWord) {
            let gameBoard = document.getElementById("game-board");
            gameBoard.classList.add("win-effect");

            // Prevent adding another set of 4 boxes
            document.getElementById("user-input").disabled = true;

            // Enable the next difficulty
            if (currentDifficulty === "easy") {
                easy_score = currentScore+1;
                updateDifficultyButtonState("medium");
                document.getElementById("medium").classList.add("active");
                medium_available = true
            } else if (currentDifficulty === "medium") {
                medium_score = currentScore+1;
                updateDifficultyButtonState("hard");
                document.getElementById("hard").classList.add("active");
                hard_available = true
            } else if (currentDifficulty === "hard") {
                hard_score = currentScore+1;
                // Display share section
                document.getElementById("share-score").style.display = "block";
                document.getElementById("share-score-value").textContent = currentScore+1;  // Assuming currentScore holds the current score
            }

            // Handle user clicks on difficulty levels (from Step 2.3)
            const difficulties = document.querySelectorAll(".difficulty");

            difficulties.forEach(difficulty => {
                difficulty.addEventListener("click", function() {
                    if (difficulty.classList.contains("active")) {
                        // Make a request to the backend to update the session's difficulty and get new words
                        currentDifficulty = difficulty.id; // set the current difficulty

                        // You can now make a request to /initialize-game again to get words for this difficulty
                        // This will be similar to the request you make when the game starts
                        // After receiving the response, update the game UI accordingly
                    }
                });
            });

            // Display a restart prompt below the game board
            //let restartPrompt = document.createElement("div");
            //restartPrompt.id = "restart-prompt";
            //restartPrompt.innerHTML = '<p>Congratulations! Would you like to play again?</p><button onclick="restartGame()">Restart</button>';
            //document.body.appendChild(restartPrompt);
        }

        } else {
            // Display error message
            errorMessage.textContent = "Invalid move. Try again.";
            errorMessage.style.display = "block";
            errorMessage.style.opacity = "1";  // Reset opacity to fully visible

            // Apply shake animation to the input boxes
            inputWordRow.classList.add("shake");

            // Remove the shake animation after it finishes
            setTimeout(() => {
                inputWordRow.classList.remove("shake");
            }, 500);

            // Fade out the error message after 3 seconds
            setTimeout(() => {
                let fadeEffect = setInterval(function () {
                    if (!errorMessage.style.opacity) {
                        errorMessage.style.opacity = "1";
                    }
                    if (errorMessage.style.opacity > "0") {
                        errorMessage.style.opacity -= "0.05";
                    } else {
                        clearInterval(fadeEffect);
                        errorMessage.style.display = "none";
                    }
                }, 50);
            }, 3000);
        }
    });
}

function restartGame() {
    // Refresh the page to restart the game
    location.reload();
}

function displayShortestPaths(data) {
    let pathsList = document.getElementById("paths-list");
    let optimalScore = document.getElementById("optimal-score");
    
    // Clear any previous paths
    pathsList.innerHTML = "";

    // Group the paths by score
    let pathsByScore = {};
    for (let path of data.paths) {
        let score = path.length - 1;
        if (!pathsByScore[score]) {
            pathsByScore[score] = [];
        }
        pathsByScore[score].push(path);
    }

    // Populate the paths
    for (let score in pathsByScore) {
        // Create a list item for the score
        let scoreLi = document.createElement("li");
        scoreLi.textContent = "Score: " + score;
        scoreLi.style.fontWeight = "bold";
        pathsList.appendChild(scoreLi);

        // Create list items for the paths
        for (let path of pathsByScore[score]) {
            let pathLi = document.createElement("li");
            pathLi.textContent = path.join(" -> ");
            pathsList.appendChild(pathLi);
        }
    }

    // Display optimal score
    optimalScore.textContent = data.score;

    // Show the shortest paths section
    document.getElementById("shortest-paths").style.display = "block";
}

document.getElementById("give-up-btn").addEventListener("click", function() {
    fetch("/give-up", {
        method: 'POST', // Add this line to specify the HTTP method
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        displayShortestPaths(data);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Get the modal and its elements
    const modal = document.getElementById("helperModal");
    const btn = document.getElementById("rules-btn");
    const closeBtn = document.getElementsByClassName("close-button")[0];

    // When the user clicks on the button, open the modal
    btn.onclick = function() {
        modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
});

document.getElementById("medium").addEventListener("click", function() {
    if (medium_available) {
        currentDifficulty = "medium";
        updateDifficultyButtonState(currentDifficulty);
        initializeGame(currentDifficulty);  // Start the game for medium difficulty
    } else {
        /* Show error message for 3 seconds and then delete*/
        let errorMessage = document.getElementById("difficulty-error-message");
        errorMessage.style.display = "block";
        errorMessage.style.opacity = "1";  // Reset opacity to fully visible
        setTimeout(() => {
            let fadeEffect = setInterval(function () {
                if (!errorMessage.style.opacity) {
                    errorMessage.style.opacity = "1";
                }
                if (errorMessage.style.opacity > "0") {
                    errorMessage.style.opacity -= "0.05";
                } else {
                    clearInterval(fadeEffect);
                    errorMessage.style.display = "none";
                }
            }, 50);
        }, 3000);
    }
});

document.getElementById("hard").addEventListener("click", function() {
    if (hard_available) {
        currentDifficulty = "hard";
        medium_available = false;
        updateDifficultyButtonState(currentDifficulty);
        initializeGame(currentDifficulty);  // Start the game for hard difficulty
    } else {
        /* Show error message for 3 seconds and then delete*/
        let errorMessage = document.getElementById("difficulty-error-message");
        errorMessage.style.display = "block";
        errorMessage.style.opacity = "1";  // Reset opacity to fully visible
        setTimeout(() => {
            let fadeEffect = setInterval(function () {
                if (!errorMessage.style.opacity) {
                    errorMessage.style.opacity = "1";
                }
                if (errorMessage.style.opacity > "0") {
                    errorMessage.style.opacity -= "0.05";
                } else {
                    clearInterval(fadeEffect);
                    errorMessage.style.display = "none";
                }
            }, 50);
        }, 3000);
    }
});

// Function to copy score to clipboard
function copyScoreToClipboard() {
    const scoreValue = document.getElementById("share-score-value").textContent;
    const textArea = document.createElement("textarea");
    textArea.value = `I scored ${easy_score}, ${medium_score} and ${hard_score} on WordWays! Try and beat my score at wordwaysgame.com`;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    document.getElementById("copy-success").style.display = "block";  // Display success message
    setTimeout(() => {  // Hide success message after 2 seconds
        document.getElementById("copy-success").style.display = "none";
    }, 2000);
}

// Event listener for the "Copy Score to Clipboard" button
document.getElementById("copy-score-btn").addEventListener("click", copyScoreToClipboard);
