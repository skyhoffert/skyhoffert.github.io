const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:5000');

var ID = 0;

const INIT_MSG = {
    'type': 'connect',
}

function key_msg(code, down=true) {
    return {
        'type': 'key',
        'down': down,
        'code': code
    };
}

ws.on('open', function open() {
    let start = new Date().getTime();
    ws.send(JSON.stringify(INIT_MSG));
});

ws.on('message', function incoming(data) {
    let obj = JSON.parse(data);

    // DEBUG
    //console.log(obj);

    switch (obj['type']){
        case 'id':
            ID = obj['id'];
            console.log('ID: ' + ID);
            break;
        case 'ping':
            let resp = JSON.stringify({'type': 'pong', 'time': obj['time']});
            ws.send(resp);
            break;
        case 'ack':
            console.log('ACK: ' + obj['message']);
            break;
        default:
            break;
    }
});

ws.on('error', function error(err){
    console.log('error: ' + err);
});

/*
let last_time = new Date().getTime();
while (1){
    console.log('running');

    while((new Date().getTime()) < last_time+(1000/30)){}
}
*/