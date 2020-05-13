// Sky Hoffert
// Back end for hvh.

const WebSocket = require("ws");

const wss = new WebSocket.Server({port: 6600});

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(msg) {
        console.log("got %s", msg);
    });
    ws.send("hi from server");
});
