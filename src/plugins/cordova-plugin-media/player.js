// Copyright (c) Microsoft Corporation. All rights reserved.

// https://github.com/apache/cordova-plugin-media/

/*global Media: false */

var _players = {};

/**
 * @param {string} id
 * @constructor
 */
function Player(id, src) {
    this.id = id;
    this.src = src;
    this._node = null;
    this._state = null; // refence to a Media.State

    this._updateState(Media.MEDIA_STARTING);
    this._prepare();
}

Player.prototype.startPlaying = function (src) {
    this.src = src;
    if (this._prepare()) {
        this._node.play();
    }
};

Player.prototype.pausePlaying = function () {
    if (this._isReady() && this._state === Media.MEDIA_RUNNING) {
        try {
            this._node.pause();
            this._updateState(Media.MEDIA_PAUSED);
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

Player.prototype.stopPlaying = function () {
    if (this._isReady() && (this._state === Media.MEDIA_RUNNING || this._state === Media.MEDIA_PAUSED)) {
        try {
            this._node.pause();
            this.seekToAudio(0);
            this._updateState(Media.MEDIA_STOPPED);
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

Player.prototype.seekToAudio = function (milliseconds) {
    if (this._isReady()) {
        try {
            this._node.currentTime = (milliseconds / 1000);
        } catch (err) {
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
        }
    } else {
        this._notifyError(window.MediaError.MEDIA_ERR_NONE_ACTIVE);
    }
};

Player.prototype.destroy = function () {
    try {
        if (this._isReady()) {
            this._node.pause();
            this._node = null;

            this._updateState(Media.MEDIA_STOPPED);
        }
    } catch (err) {
        this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);
    }
};

/**
 * @return {boolean} True when the operation is successful and the node is available,
 *                  false when there's was an error trying to create an Audio node.
 * @private
 */
Player.prototype._prepare = function () {
    if (!this._isReady()) {
        // if the player was destroyed, then the node will be null
        // and we need to create it again
        try {
            this._node = this._createAudioNode();
        } catch (err) {
            this._state = Media.MEDIA_NONE;
            this._notifyError(window.MediaError.MEDIA_ERR_ABORTED);

            return false;
        }
    }
    // audio player is ready
    return true;
};

Player.prototype.getCurrentPosition = function (success, fail) {
    var position = this._node.currentTime;

    this._notifyStatus(Media.MEDIA_POSITION, position);
    success(position);
};

Player.prototype.startRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

Player.prototype.stopRecord = function (pause) {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

Player.prototype.resumeRecord = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

Player.prototype.release = function () {
    this._player.release();
};

Player.prototype.setVolume = function (volume) {
    if (this._isReady()) {
        this._node.volume = volume;
    }
};

Player.prototype.setRate = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

Player.prototype.getCurrentAmplitude = function () {
    this._notifyError(window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, 'Not supported API');
};

/**
 * @number {state}
 * @private
 */
Player.prototype._updateState = function (state) {
    if (this._state !== state) {
        this._state = state;

        this._notifyStatus(Media.MEDIA_STATE, this._state);
    }
};

/**
 * @param {number} code
 * @param {string=} message
 * @private
 */
Player.prototype._notifyError = function (code, message) {
    var mediaError = {
        code: code
    };

    if (typeof msg !== 'undefined') {
        mediaError.message = message;
    }

    this._notifyStatus(Media.MEDIA_ERROR, mediaError);
};

Player.prototype._notifyStatus = function (type, value) {
    if (window.Media.onStatus) {
        window.Media.onStatus(this.id, type, value);
    }
};

/**
 * Check if the media player is ready: the Audio instance is available.
 * @return {boolean}
 * @private
 */
Player.prototype._isReady = function () {
    return !!this._node;
};

/**
 * Creates a new player with necessary event listeners attached.
 * @return {Audio}
 * @trows
 * @private
 */
 Player.prototype._createAudioNode = function () {
    var node = new Audio();
    node.onloadstart = this._updateState.bind(this, Media.MEDIA_STARTING);
    node.onplaying = this._updateState.bind(this, Media.MEDIA_RUNNING);
    node.onended = this._updateState.bind(this, Media.MEDIA_STOPPED);

    node.ondurationchange = function (e) {
        this._notifyStatus(Media.MEDIA_DURATION, (e.target.duration || -1));
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

function getById(id) {
    return _players[id];
}

function createIfNeeded(id, src) {
    var player = getById(id);
    if (!player) {
        player = new Player(id, src);
        _players[id] = player;
    }

    return player;
}

function removeById(id) {
    if (_players[id]) {
        delete _players[id];
    }
}

module.exports.createIfNeeded    = createIfNeeded;
module.exports.getById           = getById;
module.exports.removeById        = removeById;
