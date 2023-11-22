from flask import Flask, render_template, request, jsonify, session
import random
from script import load_graph, load_words
from collections import deque
import json
import time

start_time = time.time()

IS_DAILY = True

application = Flask(__name__)
application.secret_key = 'secret_key1'

words = load_words('wordsdetail2.txt')
graph = load_graph('wordsdetail_graph.pkl')
word_freq = json.load(open('word_freq.json', 'r'))

@application.route('/')
def index():
    return render_template('index.html')

@application.route('/initialize-game', methods=['GET'])
def initialize_game():
    user_date = request.args.get('date')
    print("User date is {}".format(user_date))
    difficulty = request.args.get('difficulty', 'easy')

    if IS_DAILY and difficulty != 'infinite':
        # Use the current date as a seed
        seed = int(user_date.replace('-', ''))  # Convert YYYY-MM-DD to YYYYMMDD
        random.seed(seed)
    elif difficulty == 'infinite':
        # Use the current time as a seed including seconds
        seed = int(time.time())
        random.seed(seed)

    while True:
        # Randomly select start and end words using weights from word_freq
        start_word = random.choices(words, weights=[word_freq[word] for word in words])[0]
        current_word = start_word
        target_word = random.choices(words, weights=[word_freq[word] for word in words])[0]
        while current_word == target_word:
            target_word = random.choice(words)

        path = find_shortest_path(graph, start_word, target_word)
        print(path)

        if path:
            shortest_path_length = len(path) - 1

        print("Difficulty is {}".format(difficulty))
        if difficulty == 'easy' and shortest_path_length == 3:
            break
        elif difficulty == 'medium' and 4 <= shortest_path_length <= 5:
            break
        elif difficulty == 'hard' and shortest_path_length >= 6:
            break
        elif difficulty == 'infinite':
            break

    # Set session variables
    session['start_word'] = start_word
    session['current_word'] = current_word
    session['target_word'] = target_word
    session['word_history'] = [current_word]
    session['score'] = 0

    score = 0

    return jsonify({
        'startWord': current_word,
        'endWord': target_word
    })

@application.route('/play-move', methods=['POST'])
def play_move():
    data = request.json
    move = data['move']
    frontend_score = data['score']
    word_history = session['word_history']
    score = session['score']
    current_word = session['current_word']

    # If the received score is less than the backend's score, 
    # it means the user has used the "Undo" button.
    # Update the backend's score to match the frontend's score
    if frontend_score < score:
        score = frontend_score

    print('Trying move:', move, 'with last word:', current_word)

    # Check if the move is valid
    if move in graph[current_word]:
        current_word = move
        word_history.append(move)
        score += 1
        valid_move = True
    else:
        valid_move = False

    # Update session variables
    session['current_word'] = current_word
    session['score'] = score
    session['word_history'] = word_history

    return jsonify({
        'valid': valid_move,
        'score': score
    })

@application.route('/undo-move', methods=['POST'])
def undo_move():
    # Load session variables
    start_word = session['start_word']
    current_word = session['current_word']
    score = session['score']
    word_history = session['word_history']

    # Decrement the score
    score -= 1

    # Remove the latest word from the history
    if word_history:
        word_history.pop()

    # Set current_word to the latest word in the history, or the starting word if history is empty
    current_word = word_history[-1] if word_history else start_word

    # Update session variables
    session['current_word'] = current_word
    session['score'] = score
    session['word_history'] = word_history

    return jsonify(success=True)

# Add this route to provide shortest paths
@application.route('/shortest-paths', methods=['GET'])
def get_shortest_paths():
    start_word = session['start_word']
    target_word = session['target_word']
    paths = get_shortest_paths_ops(graph, start_word, target_word)
    return jsonify({
        'paths': paths,
        'score': len(paths[0]) - 1 if paths else 0
    })

# Add this route to handle the "Give Up?" button
@application.route('/give-up', methods=['POST'])
def give_up():
    # Logic same as above
    return get_shortest_paths()

@application.route('/load-game-state', methods=['POST'])
def load_game_state():
    data = request.get_json()
    difficulty = data.get('difficulty')
    score = data.get('score')
    wordHistory = data.get('historyRows')
    print(wordHistory)
    if not wordHistory:
        wordHistory = []

    session['current_word'] = wordHistory[-1] if wordHistory else session['start_word']
    session['difficulty'] = difficulty
    session['score'] = score
    session['word_history'] = wordHistory

    return jsonify({'status': 'success'})

##### Helper functions #####

def find_shortest_path(graph, start, end):
    """
    Find the shortest path between start and end words using BFS.
    """
    visited = set()
    queue = deque([(start, [start])])  # Each element in the queue is a tuple (current_word, path_so_far)

    print('Finding shortest path from {} to {}'.format(start, end))
    while queue:
        current_word, path = queue.popleft()

        # If the current word is the end word, we've found a path
        if current_word == end:
            return path

        # Mark the current word as visited
        visited.add(current_word)

        # Add all neighboring words to the queue, if they haven't been visited yet
        for neighbor in graph[current_word]:
            if neighbor not in visited:
                queue.append((neighbor, path + [neighbor]))

    # If we reach here, it means there's no path from start to end
    return None

def get_shortest_paths_ops(graph, start, end):
    # Function that returns all the shortest paths
    print("Finding shortest paths from {} to {}".format(start, end))
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

    # # Get all shortest paths
    # shortest_paths = []
    # min_length = min(len(path) for path in paths)
    # for path in paths:
    #     if len(path) == min_length:
    #         shortest_paths.append(path)

    # If we reach here, it means there's no path from start to end
    return paths

# run app
if __name__ == '__main__':
    application.run(debug=True)
