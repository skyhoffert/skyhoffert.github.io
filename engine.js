// Sky Hoffert
// November 11, 2018

const request = require('request');

var DB_INIT = {
    'players': [],
    'balls': [],
    'walls': [],
    'canvas': {
        'width': 1600,
        'height': 900
    }
};

var db = {};

function grab_db(){
    request('http://localhost:5000/api/get_db', function (error, response, body) {
        db = JSON.parse(body);
    });

    return db;
}

console.log(grab_db());

request.post({url: 'http://localhost:5000/api/init', json: JSON.stringify(DB_INIT)}, function(err, httpResponse, body){
    if (err) {
        console.log('Error');
    }
    console.log('body: ' + body);
});

setTimeout(grab_db, 3000);
console.log(db);

/*
    res = requests.post('http://localhost:5000/api/init', json=db)
    print(res.text)
    sys.stdout.flush()

    #data = {'x': 0, 'y': 0}
    #res = requests.post('http://localhost:5000/api/ball_update/1', json=data)
    #print(res.text)

    #res = requests.get('http://localhost:5000/api/get_db')
    #print(res.text)
}
*/