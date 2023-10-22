import time
import random
import pickle
from collections import defaultdict, deque
WORDS_PATH = 'wordsdetail2.txt'
GRAPH_PATH = 'wordsdetail_graph.pkl'


##### Helper Functions #####

def load_words(path):
    if not path:
        path = WORDS_PATH
    with open(path) as f:
        res = f.readlines()
    words = []
    for line in res:
        for word in line.split(','):
            word = word.strip().replace('"', '')
            if len(word) != 4:
                continue
            words.append(word)
    words = [word for word in words if word != '']
    return words

def can_rearrange(word1, word2):
    return sorted(word1) == sorted(word2)

def one_letter_diff(word1, word2):
    # Function to check if two words differ by only one letter
    if len(word1) != len(word2):
        return False
    diff_count = sum(1 for a, b in zip(word1, word2) if a != b)
    return diff_count == 1

##### Graph Functions #####

def get_components(graph):
    visited = set()
    components = []
    for word in graph:
        if word not in visited:
            component = set()
            queue = deque([word])
            while queue:
                word = queue.popleft()
                if word not in visited:
                    visited.add(word)
                    component.add(word)
                    queue.extend(graph[word])
            components.append(component)
    return components

def find_shortest_path(graph, start, end):
    """
    Find the shortest path between start and end words using BFS.
    """
    visited = set()
    queue = deque([(start, [start])])  # Each element in the queue is a tuple (current_word, path_so_far)

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

def get_graph(words):
    # Build the word graph
    graph = defaultdict(list)
    for i, word1 in enumerate(words):
        for j, word2 in enumerate(words):
            if i != j and (one_letter_diff(word1, word2) or can_rearrange(word1, word2)):
                graph[word1].append(word2)
    return graph

def save_graph(graph, path):
    with open(path, "wb") as file:
        pickle.dump(graph, file)

def load_graph(path):
    if not path:
        path = GRAPH_PATH
    with open(path, "rb") as file:
        graph = pickle.load(file)
    return graph

def game_sequence(word_path, graph_path):
    # Introduction
    print("Welcome to the 4-Letter Word Path Game!")
    print("Your goal is to change the starting word to the ending word, one letter at a time, forming valid words along the way.")
    print("You can also rearrange the letters to form a new word. Enter 'BACKWARD' to revert to the previous state. Let's begin!")
    print("="*50)
    
    words = load_words(word_path)
    start_time = time.time()
    print('loading graph...')
    graph = load_graph(graph_path)
    print('graph loaded in {} seconds'.format(time.time() - start_time))

    # Randomly select start and end words
    start_word = random.choice(words)
    end_word = random.choice(words)
    while start_word == end_word:
        end_word = random.choice(words)

    history = [start_word]
    score = 0

    # Stack to save game states
    game_states = [(history.copy(), score)]

    print(f"Starting word: {start_word}")
    print(f"Target word: {end_word}")
    print("="*50)

    while True:
        next_word = input("Enter the next word in the sequence or 'BACKWARD' to revert: ").upper().strip()
        if next_word in ('ESCAPE', 'ENTER'):
            print("Game ended.")
            optimal_path = find_shortest_path(graph, start_word, end_word)
            print(f"Optimal Path: {' -> '.join(optimal_path)}")
            print(f"Optimal Score: {len(optimal_path)-1}")
            break

        # Implementing the 'BACKWARD' feature
        if next_word == "BACKWARD":
            if len(game_states) > 1:
                game_states.pop()  # remove current state
                history, score = game_states[-1]  # revert to previous state
                history = history.copy()  # ensure we're working with a new list instance
                print("\nReverted to previous state.")
                print("\nWord History:")
                print(" -> ".join(history))
                print(f"\nCumulative Score: {score}")
                print(f"Target Word: {end_word}\n")
                print("="*50)
            else:
                print("\nYou're at the starting word. Can't go backward from here.")
            continue

        # Check if the word is valid
        if next_word in graph[history[-1]]:
            history.append(next_word)
            score += 1
            game_states.append((history.copy(), score))  # save the current game state
        else:
            print("Invalid transition. Try again.")
            continue

        # Display history, score, and target word
        print("\nWord History:")
        print(" -> ".join(history))
        print(f"\nCumulative Score: {score}")
        print(f"Target Word: {end_word}\n")
        print("="*50)

        # Check for game completion
        if next_word == end_word:
            optimal_path = find_shortest_path(graph, start_word, end_word)
            print(f"Congratulations! You reached the target word.")
            print(f"Optimal Path: {' -> '.join(optimal_path)}")
            print(f"Optimal Score: {len(optimal_path)-1}")
            break


if __name__ == "__main__":
    game_sequence(WORDS_PATH, GRAPH_PATH)