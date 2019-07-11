const Apify = require('apify');

const env = Apify.getEnv();

const CHARTS_STORAGE = `status-page-charts-${env.userId}-${env.actId}`;
const STORAGE_NAME = `status-page-${env.userId}-${env.actId}`;
const COLORS_KEY = 'actor-colors';

const ACTIONS = {
    SERVE: 'serve',
    EMAIL: 'email',
    STORE: 'store',
};

const INTERVALS = {
    DAY: 'day',
    WEEK: 'week',
    TWO_WEEKS: 'two-weeks',
    MONTH: 'month',
    TWO_MONTHS: 'two-months',
};

const INTERVALS_WITH_LABELS = [
    {
        value: INTERVALS.DAY,
        label: '24 Hours',
    },
    {
        value: INTERVALS.WEEK,
        label: '7 Days',
    },
    {
        value: INTERVALS.TWO_WEEKS,
        label: '14 Days',
    },
    {
        value: INTERVALS.MONTH,
        label: '30 Days',
    },
    {
        value: INTERVALS.TWO_MONTHS,
        label: '60 Days',
    },
];

module.exports = { STORAGE_NAME, COLORS_KEY, ACTIONS, INTERVALS, INTERVALS_WITH_LABELS, CHARTS_STORAGE };
