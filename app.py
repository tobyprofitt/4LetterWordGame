from flask import Flask, render_template, request, jsonify
import random
from script import load_graph, load_words

app = Flask(__name__)

# Game state variables
current_word = ""
target_word = ""
word_history = []
score = 0

words = load_words('wordsdetail2.txt')
graph = load_graph('wordsdetail_graph.pkl')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/initialize-game', methods=['GET'])
def initialize_game():
    global start_word, current_word, target_word, word_history, score

    # Randomly select start and end words
    start_word = random.choice(words)
    current_word = start_word
    target_word = random.choice(words)
    while current_word == target_word:
        target_word = random.choice(words)

    word_history = [current_word]
    score = 0

    return jsonify({
        'startWord': current_word,
        'endWord': target_word
    })

@app.route('/play-move', methods=['POST'])
def play_move():
    global current_word, score

    data = request.json
    move = data['move']
    frontend_score = data['score']

    # If the received score is less than the backend's score, 
    # it means the user has used the "Undo" button.
    # Update the backend's score to match the frontend's score
    if frontend_score < score:
        score = frontend_score

    # Check if the move is valid
    if move in graph[current_word]:
        current_word = move
        word_history.append(move)
        score += 1
        valid_move = True
    else:
        valid_move = False

    return jsonify({
        'valid': valid_move,
        'score': score
    })

@app.route('/undo-move', methods=['POST'])
def undo_move():
    global current_word, score, word_history

    # Decrement the score
    score -= 1

    # Remove the latest word from the history
    if word_history:
        word_history.pop()

    # Set current_word to the latest word in the history, or the starting word if history is empty
    current_word = word_history[-1] if word_history else start_word

    return jsonify(success=True)

# run app
if __name__ == '__main__':
    app.run(debug=True)
