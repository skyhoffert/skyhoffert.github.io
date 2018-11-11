import json
import sys

from flask import Flask, request
app = Flask(__name__)

db = {}

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

@app.route('/api/reset', methods=['GET'])
def reset():
    # remove all but first balls
    while len(db['balls'] > 1):
        del db['balls'][1]
    
    db['balls'][0]['x'] = db['canvas']['width']/2
    db['balls'][0]['y'] = db['canvas']['height']/2

    return json.dumps(db)

@app.route('/api/init', methods=['POST'])
def init():
    db = request.json
    print(request.json)
    sys.stdout.flush()

    return json.dumps(db)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(threaded=True)