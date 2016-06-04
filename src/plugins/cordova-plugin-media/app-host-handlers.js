// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-media/

var utils = require('utils'),
    argscheck = require('argscheck');

var mediaObjects = {};

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback()
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 */
var Media = function (src, successCallback, errorCallback, statusCallback) {
    argscheck.checkArgs('SFFF', 'Media', arguments);
    this.id = utils.createUUID();
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this.node = null;
    this._duration = -1;
    this._position = -1;
    this._state = null;

    mediaObjects[this.id] = this;

    this._updateState(Media.MEDIA_STARTING);
    this._preparePlayer();
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ['None', 'Starting', 'Running', 'Paused', 'Stopped'];

// "static" function to return existing objs.
Media.get = function(id) {
    return mediaObjects[id];
};

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function () {
    if (this._preparePlayer()) {
        this.node.play();
    }
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function () {
    if (this._isReady() && (this._state === Media.MEDIA_RUNNING || this._state === Media.MEDIA_PAUSED)) {
        try {
            this.node.pause();
            this.seekTo(0);
            this._updateState(Media.MEDIA_STOPPED);
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function (milliseconds) {
    if (this._isReady()) {
        try {
            this.node.currentTime = milliseconds / 1000;
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function () {
    if (this._isReady() && this._state === Media.MEDIA_RUNNING) {
        try {
            this.node.pause();
            this._updateState(Media.MEDIA_PAUSED);
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function () {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function (success, fail) {
    if (this._isReady()) {
        var p = this.node.currentTime;
        Media.onStatus(this.id, Media.MEDIA_POSITION, p);
        success(p);
    } else {
        fail({ code: window.MediaError.MEDIA_ERR_NONE_ACTIVE});
    }
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * Pause recording audio file.
 */
Media.prototype.pauseRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * Resume recording audio file.
 */
Media.prototype.resumeRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * Release the resources.
 */
Media.prototype.release = function () {
    try {
        if (this._isReady()) {
            this.node.pause();
            this.node = null;

            this._updateState(Media.MEDIA_STOPPED);
        }
    } catch (err) {
        this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
    }
};

/**
 * Adjust the volume.
 */
Media.prototype.setVolume = function (volume) {
    if (this._isReady()) {
        this.node.volume = volume;
    } else {
         this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

/**
 * Sets playback rate.
 */
Media.prototype.setRate = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

Media.prototype.getCurrentAmplitude = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * @number {state}
 * @private
 */
Media.prototype._updateState = function (state) {
    if (this._state !== state) {
        this._state = state;

        Media.onStatus(this.id, Media.MEDIA_STATE, this._state);
    }
};

/**
 * @param {number} code
 * @param {string=} message
 * @private
 */
Media.prototype._notifyError = function (code, message) {
    var mediaError = {
        code: code
    };

    if (typeof msg !== 'undefined') {
        mediaError.message = message;
    }

    Media.onStatus(this.id, Media.MEDIA_ERROR, mediaError);
};

/**
 * Check if the media is ready: the Audio instance is available.
 * @return {boolean}
 */
Media.prototype._isReady = function () {
    return !!this.node;
};

/**
 * @return {boolean} True when the operation is successful and the node is available, false
 *                   when there's was an error trying to create an Audio node.
 * @private
 */
Media.prototype._preparePlayer = function () {
    if (!this._isReady()) {
        // if Media was released, then node will be null and we need to create it again
        try {
            this.node = this._createAudioNode();
        } catch (err) {
            this._state = Media.MEDIA_NONE;
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);

            return false;
        }
    }
    // audio player is ready
    return true;
};

/**
 * Creates new Audio node and with necessary event listeners attached.
 * @return {Audio}
 * @trows
 * @private
 */
Media.prototype._createAudioNode = function () {
    var node = new Audio();
    node.onloadstart = this._updateState.bind(this, Media.MEDIA_STARTING);
    node.onplaying = this._updateState.bind(this, Media.MEDIA_RUNNING);
    node.onended = this._updateState.bind(this, Media.MEDIA_STOPPED);

    node.ondurationchange = function (e) {
        Media.onStatus(this.id, Media.MEDIA_DURATION, e.target.duration || -1);
    }.bind(this);

    node.onerror = function (e) {
        // Due to media.spec.15 It should return MediaError for bad filename
        var code;
        if (e.target.error.code === window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
            code = window.MediaError.MEDIA_ERR_ABORTED;
        } else {
            code =  e.target.error.code;
        }

        this._notifyError(code);
    }.bind(this);

    if (this.src) {
        node.src = this.src;
    }

    return node;
};

/**
 * Audio has status update.
 *
 * @param id            The media object id (string)
 * @param msgType       The 'type' of update this is
 * @param value         Use of value is determined by the msgType
 * @private
 */
Media.onStatus = function (id, msgType, value) {
    var media = mediaObjects[id];

    if (media) {
        switch (msgType) {
            case Media.MEDIA_STATE :
                media.statusCallback && media.statusCallback(value);
                if (value === Media.MEDIA_STOPPED) {
                    media.successCallback && media.successCallback();
                }
                break;
            case Media.MEDIA_DURATION :
                media._duration = value;
                break;
            case Media.MEDIA_ERROR :
                media.errorCallback && media.errorCallback(value);
                break;
            case Media.MEDIA_POSITION :
                media._position = Number(value);
                break;
            default :
                console.error && console.error('Unhandled Media.onStatus :: ' + msgType);
                break;
        }
    } else {
         console.error && console.error('Received Media.onStatus callback for unknown media :: ' + id);
    }
};

document.addEventListener('deviceready', function () {
    window.Media = Media;
}, false);

module.exports = function (messages) {

    function emptyHandler() {}

    return {
        'Media': {
            // Despite we fully override Media object on client side
            // there is still one exec call below which is invoked during
            // platform proxy initialization on android and windowsphone
            'messageChannel': emptyHandler
        }
    };
};
