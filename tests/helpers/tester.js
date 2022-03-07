'use strict';

class Tester {
    constructor(regexes, t) {
        this.regexes = regexes;
        this.t = t;
    }

    checkMatch(metric) {
        const index = this.regexes.findIndex((regex) => metric.match(regex));

        if (index === -1) {
            this.t.fail(`The metric ${metric} does not match regexes`);
            return true;
        }

        this.t.pass(`${metric} match regex ${this.regexes[index]}`);
        this.regexes.splice(index, 1);
        return this.isFinish();
    }

    isFinish() {
        return this.regexes.length === 0;
    }

    getRemainRegexes() {
        return this.regexes;
    }
}

exports.checkMetricsMock = (regexes, app, t) => {
    const tester = new Tester(regexes, t);

    for (const metric of app.metrics.client.metrics) {
        tester.checkMatch(metric);
    }

    if (!tester.isFinish()) {
        t.fail(`Regexes don't match: ${tester.getRemainRegexes()}`);
    }
};

exports.checkMetrics = (regexes, t) => {
    const tester = new Tester(regexes, t);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!tester.isFinish()) {
                t.fail(`Regexes don't match: ${tester.getRemainRegexes()}`);
                resolve();
            }
        }, 4000);
        t.context.statsd.on('metric', (buffer) => {
            try {
                if (tester.checkMatch(buffer.toString())) resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};
