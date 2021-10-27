'use strict';

const dgram = require('dgram');
const EventEmitter = require('events');

const kServer = Symbol('server');

class StatsdMock extends EventEmitter {
    constructor() {
        super();
        this[kServer] = dgram.createSocket('udp4');
    }
    start() {
        const self = this;
        return new Promise((resolve, reject) => {
            function onError(error) {
                return reject(error);
            }
            function onDone() {
                self[kServer].removeListener('error', onError);
                return resolve(self[kServer].address());
            }
            this[kServer].once('listening', onDone);
            this[kServer].once('error', onError);
            this[kServer].on('message', (msg) => {
                this.emit('metric', msg);
            });
            this[kServer].bind(0);
        });
    }
    stop() {
        return new Promise((resolve, reject) => {
            this[kServer].close((error) => {
                return error ? reject(error) : resolve();
            });
        });
    }
}

module.exports = { StatsdMock };
