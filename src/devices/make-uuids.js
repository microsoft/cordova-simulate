const fs = require('fs');
const uuidv4 = require('uuid/v4');
const path = require('path')
let deviceList = require(path.resolve('src/devices/devices.json'));

Object.keys(deviceList).filter(platform => platform !== 'android').map(platform => {
    deviceList[platform] = deviceList[platform].map(device => {
        device.uuid = uuidv4();
        return device;
        });
});


fs.writeFileSync(path.resolve('src/devices/devices.json'),JSON.stringify(devicelist))
