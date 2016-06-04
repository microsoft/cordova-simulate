// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-media/

module.exports = function (messages) {

    var Player = require('./player');

    return {
        'Media': {
            'messageChannel': function (success, fail, args) {
                // ignore, this is only available for "android", "amazon-fireos" and "windowsphone"
                // platforms, any other access to onStatus callback is done through
                // window.Media.onStatus
            },
            'create': function (success, fail, args) {
                // args[0]: id, args[1]: src
                Player.createIfNeeded(args[0], args[1]);
            },
            'startPlayingAudio': function (success, fail, args) {
                var player = Player.createIfNeeded(args[0], args[1]);
                player.startPlaying(args[1]);
            },
            'stopPlayingAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.stopPlaying();
                }
            },
            'seekToAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.seekToAudio(args[1]);
                }
            },
            'pausePlayingAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.pausePlaying();
                }
            },
            'getCurrentPositionAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);

                if (player) {
                    player.getCurrentPosition(success, fail);
                } else {
                    success(-1);
                }
            },
            'startRecordingAudio': function (success, fail, args) {
                var player = Player.createIfNeeded(args[0]);
                player.startRecord(args[1]);
            },
            'stopRecordingAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.stopRecord(true);
                }
            },
            'pauseRecordingAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.stopRecord(false);
                }
            },
            'resumeRecordingAudio': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.resumeRecord();
                }
            },
            'release': function (success, fail, args) {
                var id = args[0],
                    player = Player.getById(id),
                    exists = !!player;

                if (exists) {
                    player.destroy();
                    Player.removeById(id);
                }
            },
            'setVolume': function (success, fail, args) {
                var player = Player.getById(args[0]);
                if (player) {
                    player.setVolume(args[1]);
                }
            },
            'setRate': function (success, fail, args) {
                // TODO check ios impl
            },
            'getCurrentAmplitudeAudio': function (success, fail, args) {
                var player = Player.getById(args[0]),
                    amplitude = 0;

                if (player) {
                    amplitude = player.getCurrentAmplitude(args[1]);
                }

                success(amplitude);
            }
        }
    };
};
