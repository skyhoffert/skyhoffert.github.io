# Sky Hoffert
# November 11, 2018

import requests
import sys

while True:
    db = {
    'players': [],
    'balls': [],
    'walls': [],
    'canvas': {
        'width': 1600,
        'height': 900
    }}
    res = requests.post('http://localhost:5000/api/init', json=db)
    print(res.text)
    sys.stdout.flush()

    #data = {'x': 0, 'y': 0}
    #res = requests.post('http://localhost:5000/api/ball_update/1', json=data)
    #print(res.text)

    #res = requests.get('http://localhost:5000/api/get_db')
    #print(res.text)
