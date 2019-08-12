let fs = require('fs');
let uuidv4 = require('uuid/v4');
let path = require('path')
let deviceList = require(path.resolve('src/devices/devices.json'));

let UUIDBlacklist = ['android']

Object.keys(deviceList).filter(platform => !UUIDBlacklist.includes(platform) ).map(platform => {
    deviceList[platform] = deviceList[platform].map(device => {
        device.uuid = uuidv4();
        return device;
        });
});


fs.writeFileSync(path.resolve('src/devices/devices.json'),JSON.stringify(devicelist))
