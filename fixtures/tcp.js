'use strict';

const EventEmitter = require('events');
const { createServer } = require('net');

module.exports = class StatsdMock extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.sockets = [];
    }
    start(port) {
        return new Promise((resolve, reject) => {
            this.server = createServer((socket) => {
                socket.on('data', (msg) => {
                    this.emit('metric', msg);
                });
                this.sockets.push(socket);
            });

            const onError = (error) => reject(error);

            const onDone = () => {
                this.server.removeListener('error', onError);
                return resolve(this.server.address());
            };
            this.server.once('listening', onDone);
            this.server.once('error', onError);
            this.server.listen(port || 0);
        });
    }

    disconnectSocket() {
        for (const sock of this.sockets) {
            sock.destroy();
        }
    }

    stop() {
        return new Promise((resolve) => {
            // Here, The close method in the old code takes as input the error, but is always undefined
            this.disconnectSocket();
            this.server.close(() => {
                resolve(null);
            });
        });
    }
};
