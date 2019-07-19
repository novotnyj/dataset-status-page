const Apify = require('apify');
const express = require('express');
const exphbs = require('express-handlebars');
const rp = require('request-promise');
const { INTERVALS, INTERVALS_WITH_LABELS } = require('./consts');
const { intervalToMoments } = require('./utils');
const { getData, getColors } = require('./dataProvider');
const { getCharts } = require('./charts');

const { APIFY_CONTAINER_PORT, APIFY_CONTAINER_URL } = process.env;
const { log } = Apify.utils;

async function updateRebrandly(input) {
    if (!input.rebrandly) return;

    const { id, apiKey, workspace, title } = input.rebrandly;
    if (!id || !apiKey || !workspace || !title) {
        return;
    }

    const data = {
        id,
        title,
        destination: `${APIFY_CONTAINER_URL}`,
    };

    const requestHeaders = {
        'Content-Type': 'application/json',
        apikey: apiKey,
        workspace,
    };

    log.info('Updating rebrand.ly', { data });
    await rp({
        uri: `https://api.rebrandly.com/v1/links/${id}`,
        method: 'POST',
        body: JSON.stringify(data),
        headers: requestHeaders,
    });

    log.info('rebrand.ly updated');
}

async function server(input) {
    const app = express();

    app.engine('handlebars', exphbs({
        defaultLayout: 'main',
    }));
    app.set('view engine', 'handlebars');

    const port = APIFY_CONTAINER_PORT || 3030;
    const url = APIFY_CONTAINER_URL || 'localhost';
    let defaultInterval = input.defaultInterval || INTERVALS.DAY;
    let availableIntervals = INTERVALS_WITH_LABELS;
    const { intervals } = input;
    const rootDir = __dirname;

    if (intervals && intervals.length > 0) {
        intervals.forEach((interval) => {
            if (!Object.values(INTERVALS).includes(interval)) {
                throw new Error(`Interval has to be an array of ${Object.values(INTERVALS).join(', ')}. Got ${interval.join(', ')}`);
            }
        });

        availableIntervals = INTERVALS_WITH_LABELS.filter((item) => intervals.includes(item.value));
        defaultInterval = availableIntervals[0].value;
    }

    const loadedCharts = await getCharts();
    const charts = input.charts || Object.values(loadedCharts || {});
    if (charts.length > 0) {
        for (const interval of Object.values(INTERVALS)) {
            const intervalObj = intervalToMoments(interval);
            for (const chart of charts) {
                await getData(intervalObj, chart.id);
            }
        }
    }

    app.get('/', (req, res) => {
        getCharts().then((data) => {
            const sortedCharts = Object.values(data).sort((a, b) => a.id > b.id);
            res.render('home', {
                showDonut: input.showDonut !== undefined ? input.showDonut : true,
                charts: sortedCharts,
            });
        });
    });

    app.get('/main.js', (req, res) => {
        res.sendFile(`${rootDir}/resources/main.js`);
    });

    app.get('/dataset-info.json', (req, res) => {
        const { interval, chartId } = req.query;
        const intervalObj = intervalToMoments(interval || defaultInterval);
        getData(intervalObj, chartId || 'default').then((data) => {
            res.json(data);
        });
    });

    app.get('/charts.json', (req, res) => {
        if (input.charts) {
            res.json(input.charts);
        } else {
            getCharts().then((data) => {
                res.json(Object.values(data));
            });
        }
    });

    app.get('/actor-colors.json', (req, res) => {
        const { chartId } = req.query;
        getColors(chartId).then((data) => {
            res.json(data);
        });
    });

    app.get('/intervals.json', (req, res) => {
        res.json({
            default: defaultInterval,
            intervals: availableIntervals,
        });
    });

    const appUrl = Apify.isAtHome() ? `Listenig on ${url}!` : `Listenig on ${url}:${port}!`;

    await updateRebrandly(input);

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
