var fs = require('fs');
var uuidv4 = require('uuid/v4');
var path = require('path')
var deviceList = require(path.resolve('src/devices/devices.json'));

var UUIDBlacklist = ['android']

Object.keys(deviceList).filter(function(platform) {!UUIDBlacklist.includes(platform)} ).map(function(platform) {
    deviceList[platform] = deviceList[platform].map(function(device) {
        device.uuid = uuidv4();
        return device;
        });
});


fs.writeFileSync(path.resolve('src/devices/devices.json'),JSON.stringify(devicelist))
