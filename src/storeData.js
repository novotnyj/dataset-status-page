const Apify = require('apify');
const moment = require('moment');
const { STORAGE_NAME, COLORS_KEY } = require('./consts');
const { getRandomColor } = require('./colors');

const MAX_DAYS = 61;

function generateActorColor(colors) {
    let color;
    let isUsed = false;
    const colorValues = Object.values(colors);
    const isColorUsed = (checkedColor) => colorValues.some((usedColor) => usedColor === checkedColor);
    do {
        color = getRandomColor();
        isUsed = isColorUsed(color);
    } while (isUsed);

    return color;
}

function dropOldItems(data) {
    const removeBefore = moment().subtract(MAX_DAYS, 'days');
    return data.filter((item) => {
        const createdMoment = moment(item.createdAt);
        return createdMoment.isAfter(removeBefore);
    });
}

function normalizeName(name) {
    return name.replace(/[\s{}"?><;=+]/g, '-');
}

async function storeData() {
    const input = await Apify.getValue('INPUT');
    console.log(`Opening ${STORAGE_NAME}`);
    const store = await Apify.openKeyValueStore(STORAGE_NAME);
    const { name, datasetId } = input;

    console.log('Getting color');
    let colors = await store.getValue(COLORS_KEY);
    if (!colors) {
        colors = {};
    }

    const normalizedName = normalizeName(name);
    if (!colors[name]) {
        colors[name] = generateActorColor(colors);
        await store.setValue(COLORS_KEY, colors);
    }

    console.log(`Will open dataset ${datasetId}`);
    const dataset = await Apify.openDataset(datasetId);
    const info = await dataset.getInfo();
    console.log(info);

    const dataItem = {
        id: info.id,
        actorName: name,
        itemCount: info.itemCount,
        actRunId: info.actRunId,
        cleanItemCount: info.cleanItemCount || info.itemCount,
        collectedAt: (new Date()).toISOString(),
        createdAt: info.createdAt,
    };

    let currentValue = await store.getValue(normalizedName);
    if (!currentValue) {
        currentValue = [dataItem];
    } else {
        currentValue = currentValue.filter((item) => item.id !== info.id);
        currentValue.push(dataItem);
    }

    currentValue = dropOldItems(currentValue);

    await store.setValue(normalizedName, currentValue);
}

module.exports = { storeData };
