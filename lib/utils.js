'use strict';

exports.gte16 = Number(process.version.split('.')[0].replace('v', '')) >= 16;
