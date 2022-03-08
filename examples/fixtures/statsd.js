'use strict';

const UdpMock = require('./udp');
const TcpMock = require('./tcp');

exports.TcpMock = TcpMock;
exports.UdpMock = UdpMock;
exports.dumpMetric = (buffer) => {
    const metric = buffer.toString();
    console.log(`metric received <----- ${metric}`);
};

if (require.main === module) {
    let port = 10000;
    const flags = process.argv.slice(2);
    let type = '';
    let mock;
    if (flags.includes('-u')) {
        type = 'udp';
        mock = new UdpMock();
    } else if (flags.includes('-t')) {
        type = 'tcp';
        mock = new TcpMock();
    } else {
        type = 'udp';
        mock = new UdpMock();
    }
    const i = flags.indexOf('-p');
    if (i !== -1) {
        port = parseInt(flags[i + 1]);
    }
    mock.on('metric', exports.dumpMetric);
    mock.start(port)
        .then((address) => {
            console.log(
                `${type} mock listening on address ${address.address} and port ${address.port}`
            );
        })
        .catch(console.error);
}
