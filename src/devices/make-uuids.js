var fs = require('fs');
var uuidv4 = require('uuid/v4');
var path = require('path')
var deviceList = require(path.resolve('src/devices/devices.json'));

var UUIDBlacklist = ['android']

Object.keys(deviceList).filter(platform => !UUIDBlacklist.includes(platform) ).map(platform => {
    deviceList[platform] = deviceList[platform].map(device => {
        device.uuid = uuidv4();
        return device;
        });
});


fs.writeFileSync(path.resolve('src/devices/devices.json'),JSON.stringify(devicelist))
