'use strict';

const UdpMock = require('./udp');
const TcpMock = require('./tcp');

const port = 10000;

exports.port = port;
exports.TcpMock = TcpMock;
exports.UdpMock = UdpMock;

if (require.main === module) {
    const type = process.argv[2];
    let mock;
    switch (type) {
        case '-u':
            mock = new UdpMock();
            break;
        case '-t':
            mock = new TcpMock();
            break;
        default:
            mock = new UdpMock();
            break;
    }
    mock.on('metric', (buffer) => {
        const metric = buffer.toString();
        console.log(`metric received <----- ${metric}`);
    });
    mock.start(port).then().catch(console.error);
}
