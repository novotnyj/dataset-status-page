const materialColors = require('material-colors');
const { getRandomInt } = require('./utils');

const primaryColorKeys = Object.keys(materialColors).filter((key) => {
    if (key.includes('Text') || key.includes('Icons')) {
        return false;
    }
    if (key === 'black' || key === 'white') {
        return false;
    }

    return true;
});

function getRandomColor() {
    console.log(primaryColorKeys);
    const key = primaryColorKeys[getRandomInt(0, primaryColorKeys.length - 1)];
    const colorKeys = Object.keys(materialColors[key]);
    const colorKey = colorKeys[getRandomInt(0, colorKeys.length - 1)];

    return materialColors[key][colorKey];
}

module.exports = { getRandomColor };
