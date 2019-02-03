const moment = require('moment');
const { INTERVALS } = require('./consts');

function intervalToMoments(interval) {
    if (interval === INTERVALS.DAY) {
        return {
            name: interval,
            start: moment().subtract(24, 'hour'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.WEEK) {
        return {
            name: interval,
            start: moment().subtract(7, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.TWO_WEEKS) {
        return {
            name: interval,
            start: moment().subtract(14, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.MONTH) {
        return {
            name: interval,
            start: moment().subtract(30, 'day'),
            end: moment(),
        };
    }
    if (interval === INTERVALS.TWO_MONTHS) {
        return {
            name: interval,
            start: moment().subtract(60, 'day'),
            end: moment(),
        };
    }

    throw new Error(`Interval has to be one of ${Object.values(INTERVALS).join(', ')}. Got "${interval}".`);
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { intervalToMoments, getRandomInt };
