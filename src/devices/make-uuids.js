var fs = require('fs');
var uuidv4 = require('uuid/v4');

var deviceList = require('./devices.json');
var UUIDPlatformBlacklist = ['android']

Object.keys(deviceList).filter(function(platform) {
    return !UUIDPlatformBlacklist.includes(platform);
}).map(function(platform) {
    deviceList[platform] = deviceList[platform].map(function(device) {
        return Object.assign(device,{uuid:uuidv4()});
    });
});

// eslint-disable-next-line no-undef
fs.writeFileSync(__dirname+'/devices.json',JSON.stringify(deviceList,null,2))
