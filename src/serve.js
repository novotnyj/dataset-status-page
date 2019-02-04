const Apify = require('apify');
const express = require('express');
const { INTERVALS, INTERVALS_WITH_LABELS } = require('./consts');
const { intervalToMoments } = require('./utils');
const { getData, getColors } = require('./dataProvider');

const { APIFY_CONTAINER_PORT, APIFY_CONTAINER_URL } = process.env;

async function server(input) {
    const app = express();
    const port = APIFY_CONTAINER_PORT || 3030;
    const url = APIFY_CONTAINER_URL || 'localhost';
    let defaultInterval = input.defaultInterval || INTERVALS.DAY;
    let availableIntervals = INTERVALS_WITH_LABELS;
    const { intervals } = input;
    const rootDir = __dirname;
    let colors = await getColors();

    if (intervals && intervals.length > 0) {
        intervals.forEach((interval) => {
            if (!Object.values(INTERVALS).includes(interval)) {
                throw new Error(`Interval has to be an array of ${Object.values(INTERVALS).join(', ')}. Got ${interval.join(', ')}`);
            }
        });

        availableIntervals = INTERVALS_WITH_LABELS.filter((item) => intervals.includes(item.value));
        defaultInterval = availableIntervals[0].value;
    }

    setInterval(async () => {
        colors = await getColors();
    }, 10 * 60 * 1000);

    const promises = [];
    for (const interval of Object.values(INTERVALS)) {
        const intervalObj = intervalToMoments(interval);
        promises.push(getData(intervalObj));
    }
    await Promise.all(promises);

    app.get('/', (req, res) => {
        res.sendFile(`${rootDir}/resources/index.html`);
    });

    app.get('/dataset-info.json', (req, res) => {
        let { interval } = req.query;
        if (!interval) {
            interval = defaultInterval;
        }

        const intervalObj = intervalToMoments(interval);
        getData(intervalObj).then((data) => {
            res.json(data);
        });
    });

    app.get('/actor-colors.json', (req, res) => {
        res.json(colors);
    });

    app.get('/intervals.json', (req, res) => {
        res.json({
            default: defaultInterval,
            intervals: availableIntervals,
        });
    });

    const appUrl = Apify.isAtHome() ? `Listenig on ${url}!` : `Listenig on ${url}:${port}!`;

    return new Promise((resolve, reject) => {
        try {
            app.listen(port, () => console.log(appUrl));
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { serve: server };
