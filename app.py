from flask import Flask, render_template, request, jsonify
import random
from script import load_graph, load_words
from collections import deque

app = Flask(__name__)

# Game state variables
current_word = ""
target_word = ""
word_history = []
score = 0

words = load_words('wordsdetail2.txt')
graph = load_graph('wordsdetail_graph.pkl')

# Write a function that will calculate how many shortests paths there are from a word to another word and return all the paths
def get_num_shortest_paths(graph, start, end):
    visited = set()
    paths = []
    queue = deque([(start, [start])])  # Each element in the queue is a tuple (current_word, path_so_far)

    while queue:
        current_word, path = queue.popleft()

        # If the current word is the end word, we've found a path
        if current_word == end:
            paths.append(path)

        # Mark the current word as visited
        visited.add(current_word)

        # Add all neighboring words to the queue, if they haven't been visited yet
        for neighbor in graph[current_word]:
            if neighbor not in visited:
                queue.append((neighbor, path + [neighbor]))

    # Get all shortest paths
    shortest_paths = []
    min_length = min(len(path) for path in paths)
    for path in paths:
        if len(path) == min_length:
            shortest_paths.append(path)

    # If we reach here, it means there's no path from start to end
    return shortest_paths

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

# Add this route to provide shortest paths
@app.route('/shortest-paths', methods=['GET'])
def get_shortest_paths():
    paths = get_num_shortest_paths(graph, start_word, target_word)
    return jsonify({
        'paths': paths,
        'score': len(paths[0]) - 1 if paths else 0
    })

# Add this route to handle the "Give Up?" button
@app.route('/give-up', methods=['POST'])
def give_up():
    # Logic same as above
    return get_shortest_paths()

# run app
if __name__ == '__main__':
    app.run(debug=True)
