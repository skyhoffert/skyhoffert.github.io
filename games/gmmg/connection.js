
// Sky Hoffert
// WS connection, used for front ends connecting to back ends.

class Connection {
	constructor(addr, pV=0x00) {
		this._addr = addr;
		this._pingRate = 1; // s
		this._lastPingTimer = 0;
		this._protocolVersion = protVer;
		
		this.ping = -1;
		
		this._sock = new WebSocket("wss://"+this._addr);
		this._sock.onmessage = this._OnMessage;
		this._connected = false;
		
		this._txQ = [];
		this._rxQ = [];
	}
	
	Close() {
		this._sock.close();
	}
	
	// NOTE: dT should be supplied in units of seconds.
	Tick(dT) {
		if (!this._connected) {
			if (this._sock.readyState === 1) {
				this._connected = true;
			}
			return;
		}
		
		this._lastPingTimer += dT;
		
		if (this._lastPingTimer >= this._pingRate) {
			this._lastPingTimer = 0;
			this._PingFunc();
		}
	}
	
	Tx(msg) {
		// TODO: send a given msg (of json format)
	}
	
	Rx() {
		if (this._rxQ.length > 0) {
			let retobj = {valid:false;};
			// TODO: update retobj or something
			return retobj;
		}
		return {valid:false};
	}
	
	_OnMessage() {
		console.log("got a msg");
	}
	
	_PingFunc() {
		// TODO: send ping message to server
	}
}
