'use strict';

const EventEmitter = require('events');
const { createServer } = require('net');

const kServer = Symbol('kServer');
const kSockets = Symbol('kSockets');
const kDisconnect = Symbol('kDisconnect');

module.exports = class StatsdMock extends EventEmitter {
    constructor() {
        super();
        this[kServer] = null;
        this[kSockets] = [];
    }
    start(port) {
        return new Promise((resolve, reject) => {
            this[kServer] = createServer((socket) => {
                socket.on('data', (msg) => {
                    this.emit('metric', msg);
                });
                this[kSockets].push(socket);
            });

            const onError = (error) => reject(error);

            const onDone = () => {
                this[kServer].removeListener('error', onError);
                return resolve(this[kServer].address());
            };
            this[kServer].once('listening', onDone);
            this[kServer].once('error', onError);
            this[kServer].listen(port || 0);
        });
    }

    [kDisconnect]() {
        for (const sock of this[kSockets]) {
            sock.destroy();
        }
    }

    stop() {
        return new Promise((resolve) => {
            // Here, The close method in the old code takes as input the error, but is always undefined
            this[kDisconnect]();
            this[kServer].close(() => {
                resolve(null);
            });
        });
    }
};
