# Sky Hoffert
# November 11, 2018

import json
import socketserver
import sys
import threading

db = {}

class MyTCPHandler(socketserver.BaseRequestHandler):
    """
    The request handler class for our server.

    It is instantiated once per connection to the server, and must
    override the handle() method to implement communication to the
    client.
    """

    def handle(self):
        # self.request is the TCP socket connected to the client
        self.data = self.request.recv(1024).strip()
        print("{} wrote:".format(self.client_address[0]))
        print(self.data)
        # just send back the same data, but upper-cased
        self.request.sendall(self.data.upper())

def client():
    pass

def main():
    HOST, PORT = 'localhost', 5000

    with socketserver.TCPServer((HOST, PORT), MyTCPHandler) as server:
        server.serve_forever()

if __name__ == '__main__':
    main()