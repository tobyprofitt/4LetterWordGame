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
    global current_word, target_word, word_history, score

    # Randomly select start and end words
    current_word = random.choice(words)
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

    move = request.json['move']

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

# run app
if __name__ == '__main__':
    app.run(debug=True)
