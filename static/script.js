let startWord = "";  // Filled by the server
let endWord = "";    // Filled by the server

function initializeGame() {
    fetch('/initialize-game')
    .then(response => response.json())
    .then(data => {
        document.getElementById('start-word').textContent = data.startWord;
        document.getElementById('end-word').textContent = data.endWord;

        // Initialize word history with the starting word
        let historyList = document.getElementById("word-history");
        let listItem = document.createElement("li");
        listItem.textContent = data.startWord;
        historyList.appendChild(listItem);
    });
}

function submitWord() {
    let userInput = document.getElementById("user-input").value.toUpperCase();

    // Send the userInput to the server for validation
    fetch('/play-move', {
        method: 'POST',
        body: JSON.stringify({
            'move': userInput
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.valid) {
            let historyList = document.getElementById("word-history");
            let listItem = document.createElement("li");
            listItem.textContent = userInput;
            historyList.appendChild(listItem);

            document.getElementById("score").textContent = data.score;
            document.getElementById("user-input").value = "";  // Clear the input

            // Check if user reached the target word
            if (userInput === endWord) {
                alert("Congratulations! You reached the target word.");
            }
        } else {
            alert("Invalid move. Try again.");
        }
    });
}
