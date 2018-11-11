import json
import sys

from flask import Flask, request
app = Flask(__name__)

db = {'players': {}, 'balls': {}}

@app.route('/api/player_update/<id>', methods=['POST'])
def player_update(id):
    db['players'][id] = {'x': 0, 'y': 0}

    return json.dumps(db)

@app.route('/api/ball_update/<id>', methods=['POST'])
def ball_update(id):
    db['balls'][id] = request.json
    print(request.json)
    sys.stdout.flush()
    return json.dumps(db)

@app.route('/api/get_db', methods=['GET'])
def get_db():
    return json.dumps(db)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(threaded=True)