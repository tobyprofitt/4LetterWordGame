let startWord = "";  // Filled by the server
let endWord = "";    // Filled by the server
let currentDifficulty = "easy";
let easy_score = 0;
let medium_score = 0;
let hard_score = 0;
var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds. This is to get the date in the local timezone.
let currentDate = (new Date(Date.now() - tzoffset)).toISOString().slice(0,10); // YYYY-MM-DD format
let wordDefinitions = {};

document.addEventListener('DOMContentLoaded', function() {
    clearAllStates();

    // Get the modal and its elements
    const modal = document.getElementById("helperModal");
    const btn = document.getElementById("rules-btn");
    const closeBtn = document.getElementsByClassName("close-button")[0];
    loadWordDefinitions();

    // Set infinite mode to blue
    document.getElementById("infinite").style.backgroundColor = "#007BFF";

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

    // console log to check if the script is loaded
    console.log("script.js loaded");
});

document.getElementById("user-input").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        submitWord();
    }
});

function loadWordDefinitions() {
    // Path to your word_definitions.json file
    fetch('static/word_definitions.json')
    .then(response => response.json())
    .then(data => {
        wordDefinitions = data;
    })
    .catch(error => console.error('Error loading word definitions:', error));
}

function addHoverToWord(wordElement) {
    console.log("addHoverToWord called");
    wordElement.addEventListener('mouseenter', function() {
        const word = wordElement.getAttribute('data-word');
        const definitions = wordDefinitions[word];
        const definitionText = definitions && definitions.length > 0 ? definitions[0] : 'Definition not available.';

        const tooltipText = document.createElement('span');
        tooltipText.className = 'tooltiptext';
        tooltipText.textContent = definitionText;

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        wordElement.appendChild(tooltip);
        tooltip.appendChild(tooltipText);
    });

    wordElement.addEventListener('mouseleave', function() {
        const tooltip = wordElement.querySelector('.tooltip');
        if (tooltip) {
            wordElement.removeChild(tooltip);
        }
    });
}

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
    document.getElementById("undo-btn").disabled = false;
    document.getElementById("submit-btn").disabled = false;
    currentDifficulty = difficulty;
    console.log("initializeGame called");
    clearBoard();
    fetch(`/initialize-game?difficulty=${difficulty}&date=${currentDate}`)
    .then(response => response.json())
    .then(data => {
        startWord = data.startWord;
        console.log("startWord: " + startWord)
        endWord = data.endWord;
        console.log("endWord: " + endWord)

        // Populate starting and ending word squares
        populateWordSquares("start-letter-", startWord);
        populateWordSquares("end-letter-", endWord);
        loadGameState(difficulty);
    });
    console.log("initializeGame finished");
}

// Function to update the button state of the difficulty level
function updateDifficultyButtonState(difficulty, completion) {    
    if (completion === true) {
        console.log("updateDifficultyButtonState called for " + difficulty + " with completion = true");
        document.getElementById(difficulty).classList.add("completed");
    }
}

function populateWordSquares(prefix, word) {
    for (let i = 0; i < word.length; i++) {
        document.getElementById(prefix + (i + 1)).textContent = word[i];
        // add definition to letter-boxes
        let letterBox = document.getElementById(prefix + (i + 1));
        letterBox.setAttribute("data-word", word);
        addHoverToWord(letterBox);
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
        letterBox.setAttribute("data-word", guess);
        newRow.appendChild(letterBox);
        addHoverToWord(letterBox);
    }

    // Insert the new history row just above the input word row
    gameBoard.insertBefore(newRow, document.getElementById("input-word-row"));

    // Save gamestate
    saveGameState();
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
            // Increment the score
            document.getElementById("score").textContent = data.score;
            currentScore = data.score;
            console.log("currentScore: " + currentScore);

            // Save game state
            saveGameState();

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
            document.getElementById("undo-btn").disabled = true;
            document.getElementById("submit-btn").disabled = true;


            // Enable the next difficulty
            if (currentDifficulty === "easy") {
                easy_score = currentScore+1;
                updateDifficultyButtonState("easy", true);
                document.getElementById("medium").classList.add("active");
            } else if (currentDifficulty === "medium") {
                medium_score = currentScore+1;
                updateDifficultyButtonState("medium", true);
                document.getElementById("hard").classList.add("active");
            } else if (currentDifficulty === "hard") {
                hard_score = currentScore+1;
                updateDifficultyButtonState("hard", true);
                // Display share section
                document.getElementById("share-score").style.display = "block";
                document.getElementById("share-score-value").textContent = currentScore+1;  // Assuming currentScore holds the current score
            }

            // Handle user clicks on difficulty levels
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

// Button listeners
document.getElementById("easy").addEventListener("click", function() {
    document.getElementById("easy").disabled = true;
    saveGameState();
    currentDifficulty = "easy";
    updateDifficultyButtonState(currentDifficulty);
    initializeGame(currentDifficulty);
    document.getElementById("easy").disabled = false;});
document.getElementById("medium").addEventListener("click", function() {
    document.getElementById("medium").disabled = true;
    saveGameState();
    currentDifficulty = "medium";
    updateDifficultyButtonState(currentDifficulty);
    initializeGame(currentDifficulty);  
    document.getElementById("medium").disabled = false;});
document.getElementById("hard").addEventListener("click", function() {
    document.getElementById("hard").disabled = true;
    saveGameState();
    currentDifficulty = "hard";
    updateDifficultyButtonState(currentDifficulty);
    initializeGame(currentDifficulty); 
    document.getElementById("hard").disabled = false;});
document.getElementById("infinite").addEventListener("click", function() {
    currentDifficulty = "infinite";
    initializeGame("infinite"); });

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
document.getElementById("copy-score-btn").addEventListener("click", copyScoreToClipboard);

function saveGameState() {
    // Saves the guessed words and the current score to localStorage
    console.log("saveGameState called");
    let currentScore = parseInt(document.getElementById("score").textContent);
    let gameBoardHTML = document.getElementById("game-board").innerHTML;
    let gameBoard = document.getElementById("game-board");
    let historyRows = gameBoard.querySelectorAll(".word-row:not(#start-word-row, #input-word-row, #end-word-row)");
    let guessedWords = []
    for (let row of historyRows) {
        // add data-word of each row to guessedWords
        guessedWords.push(row.querySelector(".letter-box").getAttribute("data-word"));
    }

    if (!guessedWords || guessedWords.length === 0) {
        return;
    }

    let lastWord = guessedWords[guessedWords.length - 1];
    let gameState = {
        gameBoardHTML: document.getElementById("game-board").innerHTML,
        score: currentScore,
        historyRows: guessedWords,
        lastWord: lastWord
    };

    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds. This is to get the date in the local timezone.
    let currentDate = (new Date(Date.now() - tzoffset)).toISOString().slice(0,10); // YYYY-MM-DD format

    localStorage.setItem(`wordwaysGameState_${currentDifficulty}`, JSON.stringify(gameState));
    localStorage.setItem(`lastPlayedDate_${currentDifficulty}`, currentDate);

    console.log("Saved state: ", gameState);
    console.log("Saved on: ", currentDate);
}

function loadGameState(difficulty) {
    let savedState = localStorage.getItem(`wordwaysGameState_${difficulty}`);
    let lastPlayedDate = localStorage.getItem(`lastPlayedDate_${difficulty}`);
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds. This is to get the date in the local timezone.
    let currentDate = (new Date(Date.now() - tzoffset)).toISOString().slice(0,10); // YYYY-MM-DD format

    console.log("loadGameState called for difficulty:", difficulty);
    console.log("Saved State: ", savedState);
    console.log("Last Played Date: ", lastPlayedDate, "Current Date: ", currentDate);

    if ((savedState && lastPlayedDate === currentDate) && (difficulty != "infinite")) {
        let gameState = JSON.parse(savedState);
        document.getElementById("game-board").innerHTML = gameState.gameBoardHTML;
        score = gameState.score;
        document.getElementById("score").textContent = score;

        // search for last guessed word in HTML
        let gameBoard = document.getElementById("game-board");
        let historyRows = gameBoard.querySelectorAll(".word-row:not(#start-word-row, #input-word-row, #end-word-row)");
        let guessedWords = []
        for (let row of historyRows) {
            // add data-word of each row to guessedWords
            guessedWords.push(row.querySelector(".letter-box").getAttribute("data-word"));
            // add hover to each letter-box for guessed words
            let letterBox = row.querySelector(".letter-box");
            addHoverToWord(letterBox);
        }

        // add hover to each letter-box for start and target words
        let startWordLetterBoxes = document.querySelectorAll("#start-word-row .letter-box");
        for (let letterBox of startWordLetterBoxes) {
            addHoverToWord(letterBox);
        }
        let endWordLetterBoxes = document.querySelectorAll("#end-word-row .letter-box");
        for (let letterBox of endWordLetterBoxes) {
            addHoverToWord(letterBox);
        }
    
        // Check if words were guessed
        if (historyRows.length > 0) {
            let lastGuessedWord = historyRows[historyRows.length - 1].querySelector(".letter-box").getAttribute("data-word");
            console.log("Last word:", lastGuessedWord, "\nEnd word:", endWord);

            // If lastword = target word add win affect and disable undo/submit
            if (lastGuessedWord === endWord) {
                let gameBoard = document.getElementById("game-board");
                gameBoard.classList.add("win-effect");
                document.getElementById("user-input").disabled = true;
                document.getElementById("undo-btn").disabled = true;
                document.getElementById("submit-btn").disabled = true;

                // Update button colours !!BUG
                updateDifficultyButtonState(difficulty, true);
            }
        }

        // Send the loaded state to the backend
        fetch(`/load-game-state`, {
            method: 'POST',
            body: JSON.stringify({
                'difficulty': difficulty,
                'score': gameState.score,
                'historyRows': guessedWords,
                'lastWord': gameState.lastWord
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });


        console.log("Game state loaded");
    } else {
        console.log("No saved game state for today, or state is outdated.");
        localStorage.removeItem(`wordwaysGameState_${difficulty}`);
        localStorage.removeItem(`lastPlayedDate_${difficulty}`);
    }
}

function clearAllStates(){ 
    console.log("clearAllStates called");
    localStorage.clear(); 
}