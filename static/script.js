let startWord = "";  // Filled by the server
let endWord = "";    // Filled by the server

document.getElementById("user-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitWord();
    }
});

function initializeGame() {
    fetch('/initialize-game')
    .then(response => response.json())
    .then(data => {
        startWord = data.startWord;
        endWord = data.endWord;

        // Populate starting and ending word squares
        populateWordSquares("start-letter-", startWord);
        populateWordSquares("end-letter-", endWord);
    });
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
                alert("Congratulations! You reached the target word.");
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
