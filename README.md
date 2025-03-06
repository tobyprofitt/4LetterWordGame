# WordWays

🎮 **[Play WordWays](http://wordwaysgame.com/)**

WordWays is a word game where the goal is to transform the start word into the target word in as few moves as possible. 

<img width="500" alt="wordways" src="https://github.com/user-attachments/assets/f03c3db5-d3c9-4db6-9b97-d712eb7e4cee" />

You can make two types of moves:

1. Rearrange the letters, or
2. Swap one letter for a new letter.

Each move must be a valid word in the English dictionary. Specifically, we use [this list](https://www.wordsdetail.com/4-letter-words/) of words.

## How to run on Mac

```bash
# Install Python 3.9
brew install python@3.9

# Install pip
brew install pip

# Create a virtual environment using python 3.9 (IMPORTANT! Use 3.9)
python3.9 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install the requirements
pip install -r requirements.txt

# Run the script
python application.py
```

Open the browser and go to http://localhost:5000

Any time you want to run the script, you need to activate the virtual environment again.

## Bugs / TODO

Have fun
