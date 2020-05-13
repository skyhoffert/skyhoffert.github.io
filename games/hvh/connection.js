// Sky Hoffert
// Classes for maintaining a socket connection.

class Connection {
    constructor(ip,port) {
        this._ip = ip;
        this._port = port;
        this._addr = ""+this._ip+":"+this._port;

        this._hasInited = false;
        this._connected = false;

        this._timers = [];

        this._InitSock();
    }

    _InitSock() {
        let self = this;
        this._sock = new WebSocket("ws://"+this._ip+":"+this._port);
        this._sock.onopen = function open() {
            self._CheckConn();
        }
        this._sock.onmessage = function rx(msg) {
            self._Recv(msg.data);
        };
        this._sock.onerror = function err(e) {
            self._ConnError(e);
        }
    }

    _ConnError(e) {
        console.log("in err: ip=%s", this._ip);
    }

    _Recv(msg) {
        console.log("in recv: ip=%s", this._ip);
        console.log("got %s", msg);
    }

    _CheckConn() {
        console.log("in checkconn: ip=%s", this._ip);
    }

    _RunTimerExpiry(t, p) {
        // TODO
    }

    Tick(dT) {
        // Check Timers for expiry.
        for (let i = 0; i < this._timers.length; i++) {
            if (this._timers[i].Tick(dT)) {
                this._RunTimerExpiry(this._timers[i].type, this._timers[i].params);
                this._timers.splice(i,1);
                i--;
            }
        }
    }
}
