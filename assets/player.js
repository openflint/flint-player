/**
 * Copyright 2014 Infthink(Beijing) Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Receiver / Player sample
 * <p>
 * This sample demonstrates how to build your own Receiver for use with Fling
 * SDK. One of the goals of this sample is to be fully UX compliant.
 * </p>
 * <p>
 * A receiver is typically an HTML5 application with a html, css, and JavaScript
 * components. It demonstrates the following Fling Receiver API's:
 * </p>
 * <ul>
 * <li>FlingReceiverManager</li>
 * <li>MediaManager</li>
 *   <ul>
 *   <li>onLoad</li>
 *   <li>onStop</li>
 *   </ul>
 * </ul>
 * <p>
 * It also demonstrates the following player functions:
 * </p>
 * <ul>
 * <li>Branding Screen</li>
 * <li>Playback Complete image</li>
 * <li>Limited Animation</li>
 * <li>Buffering Indicator</li>
 * <li>Seeking</li>
 * <li>Pause indicator</li>
 * <li>Loading Indicator</li>
 * </ul>
 *
 */

'use strict';

// Create the namespace

window.sampleplayer = window.sampleplayer || {};

/**
 * Describes the state of the player
 *
 * @enum {string}
 */
sampleplayer.State = {
    LAUNCHING: 'launching',
    LOADING: 'loading',
    BUFFERING: 'buffering',
    PLAYING: 'playing',
    PAUSED: 'paused',
    STALLED: 'stalled',
    DONE: 'done',
    IDLE: 'idle'
};

var elementControl = {
    "init": function () {
        this.alertBox.init();
        this.volumeChange.init();
        this.player.init();
    }
};
elementControl.alertBox = {
    "init": function () {
        this.alert = document.getElementById("alert");
        this.alertText = document.getElementById("alert-text");
    },
    "show": function (text) {
        this.alertText.innerHTML = text;
        this.alert.className = "alert";
    },
    "hide": function () {
        this.alert.className = "alert hide";
    }
};
elementControl.volumeChange = {
    "currVolumeNum": 0,
    "init": function () {
        this.iconVolume = document.getElementById("icon-option");
    },
    "quiet": function () {
        this.currVolumeNum = 0;
        this.show();
    },
    "hide": function () {
        this.iconVolume.className = "i i-volume-" + this.currVolumeNum + " hidden";
    },
    "hideStatic":function(){
        this.iconVolume.className = "i i-volume-" + this.currVolumeNum + " hide_static";
    },
    "show": function () {
        this.iconVolume.className = "i i-volume-" + this.currVolumeNum + " show";
    },
    "minus": function () {
        this.currVolumeNum - 1 < 0 ? 0 : this.currVolumeNum -= 1;
        this.show();
    },
    "plus": function () {
        this.currVolumeNum + 1 > 10 ? 10 : this.currVolumeNum += 1;
        this.show();
    },
    "setVolume": function (num) {
        if (num > 0 && num <= 10) {
            this.currVolumeNum = num;
        }
        this.show();
    },
    "getCurrVolumeNum": function () {
        return this.currVolumeNum;
    }
};
elementControl.player = {
    "duration": 0,
    "currentTime": 0,
    "timePix": 0,
    "status": "play",//play or pause
    "timeFormat": function (sec) {
        var hours = Math.floor(sec / 3600);
        var minutes = Math.floor((sec - (hours * 3600)) / 60);
        var seconds = parseInt(sec - (hours * 3600) - (minutes * 60));
        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        var time = hours + ':' + minutes + ':' + seconds;
        return time;
    },

    "init": function () {
        this.iconPlayed = document.getElementById("icon-option");
        this.timeline = document.getElementById("timeline");
        this.loadedProcess = document.getElementById("loaded-process");
        this.playedProcess = document.getElementById("played-process");
        this.timePlayed = document.getElementById("time-played");
        this.timeTotal = document.getElementById("time-total");
        this.title = document.getElementById("title");
        this.loading = document.getElementById("loading");
        this.logo = document.getElementById("logo");
        this.timeLabel = document.getElementById("time-label");
        this.timePlayedString = document.getElementById("time-played-string");
    },

    "loadedmetadata": function (duration) {
        this.timePlayedString.innerHTML = this.timePlayed.innerHTML = this.timeFormat(0);
        if (duration < 0) {
            this.duration = 0;
            this.timePix = 0;
        } else {
            var w = this.timeline.scrollWidth - this.timePlayed.offsetWidth-25;
            this.timeline.style.width = w + "px";
            this.duration = duration;
            this.timePix = w / this.duration;
        }
        this.timeTotal.style.right = (this.timePlayed.offsetWidth*-1-25) + "px";
        this.timeTotal.innerHTML = this.timeFormat(this.duration);
    },
    "pause": function () {
        this.status = "pause";
        this.showPlayIcon();
        this.showTimeline();
        this.showTitle();
    },

    "play": function () {
        this.status = "play";
        this.hidePlayIcon();
        this.hideTimeline();
        this.hideTitle();
        this.hideLogo();
    },

    "buffered": function (loadedTime) {
        this.loadedProcess.style.width = (this.timePix * loadedTime) + "px";
    },

    "timeupdate": function (currentTime) {
        if (this.currentTime > this.duration) {
            this.currentTime = this.duration;
        } else if (this.currentTime < 0) {
            this.currentTime = 0;
        } else {
            this.currentTime = currentTime;
        }
        var w = this.timePix * this.currentTime;
        this.playedProcess.style.width = w + "px";
        this.timePlayedString.innerHTML = this.timePlayed.innerHTML = this.timeFormat(this.currentTime);
        if(w<25+this.timePlayed.offsetWidth){
            this.timePlayed.style.left = "25px";
        }else{
            this.timePlayed.style.left = (w-25-this.timePlayed.offsetWidth) + "px";
        }
        this.timeLabel.style.left = (w - 68)+ "px";
    },

    "setTitle": function (title) {
        this.title.innerHTML = title;
    },

    "loadingStart": function () {
        this.loading.className = "loading";
    },

    "loadingStop": function () {
        this.loading.className = "loading hide";
    },

    "showTitle": function () {
        this.title.className = "title show";
    },
    "hideTitle": function () {
        this.title.className = "title hidden";
    },
    "hideTitleStatic": function(){
        this.title.className = "title hide_static";
    },

    "showTimeline": function () {
        this.timeline.className = "timeline show";
    },
    "hideTimeline": function () {
        this.timeline.className = "timeline hidden";
    },
    "hideTimelineStatic": function(){
        this.timeline.className = "timeline hide_static";  
    },

    "showPlayIcon": function () {
        this.iconPlayed.className = "i i-play show";
    },
    "hidePlayIcon": function () {
        this.iconPlayed.className = "i i-play hidden";
    },
    "hidePlayIconStatic": function(){
        this.iconPlayed.className = "i i-play hide_static";  
    },

    "showLogo": function () {
        this.logo.className = "logo";
    },
    "hideLogo": function () {
        this.logo.className = "logo hide";
    },
    "hideLogoStatic": function(){
        this.logo.className = "logo hide_static";
    },

    "showTimeLabel": function(){
        this.timeLabel.className = "time-label";
    },
    "hideTimeLabel": function(){
        this.timeLabel.className = "time-label hide";
    },
    "hideTimeLabelStatic": function(){
        this.timeLabel.className = "time-label hide_static";
    }
};

var volumeset_timeout = null;

/****************************/
/**
 * <p>
 * Fling player constructor - This does the following:
 * </p>
 * <ol>
 * <li>Bind a listener to visibilitychange</li>
 * <li>Set the default state</li>
 * <li>Bind event listeners for img & video tags<br />
 *  error, stalled, waiting, playing, pause, ended, timeupdate, seeking, &
 *  seeked</li>
 * <li>Find and remember the various elements</li>
 * <li>Create the MediaManager and bind to onLoad & onStop</li>
 * </ol>
 *
 * @param {Element} element the element to attach the player
 * @constructor
 * @export
 */
sampleplayer.FlingPlayer = function (element) {

    /**
     * The DOM element the player is attached.
     * @private {Element}
     */
// We want to know when the user changes from watching our content to watching
// another element, such as broadcast TV, or another HDMI port.  This will only
// fire when CEC supports it in the TV.
//    this.element_.ownerDocument.addEventListener(
//        'mozvisibilitychange', this.onVisibilityChange_.bind(this), false);
//    this.element_.ownerDocument.addEventListener(
//        'webkitvisibilitychange', this.onVisibilityChange_.bind(this), false);
    /**
     * The current state of the player
     * @private {sampleplayer.State}
     */
    this.state_;
    this.setState_(sampleplayer.State.LAUNCHING);

    /**
     * The media element
     * @private {HTMLMediaElement}
     */
    this.mediaElement_ = element;
    this.mediaElement_.addEventListener('error', this.onError_.bind(this), false);
    this.mediaElement_.addEventListener('stalled', this.onStalled_.bind(this),
        false);
    this.mediaElement_.addEventListener('waiting', this.onBuffering_.bind(this),
        false);
    this.mediaElement_.addEventListener('playing', this.onPlaying_.bind(this),
        false);
    this.mediaElement_.addEventListener('pause', this.onPause_.bind(this), false);
    this.mediaElement_.addEventListener('ended', this.onEnded_.bind(this), false);
    this.mediaElement_.addEventListener('timeupdate', this.onProgress_.bind(this),
        false);
    this.mediaElement_.addEventListener('seeking', this.onSeekStart_.bind(this),
        false);
    this.mediaElement_.addEventListener('seeked', this.onSeekEnd_.bind(this),
        false);

    this.mediaElement_.addEventListener('volumechange', this.onVolumeChange_.bind(this), false);

    this.mediaElement_.addEventListener('loadedmetadata', this.onLoadedMetadata_.bind(this), false);

    //todo 
    var playerDiv = new MediaPlayer(this.mediaElement_);
};

sampleplayer.FlingPlayer.prototype.onVolumeChange_ = function () {

};

sampleplayer.FlingPlayer.prototype.onLoadedMetadata_ = function () {
    elementControl.player.loadedmetadata(this.mediaElement_.duration);

}

/**
 * Sets the state of the player
 *
 * @param {sampleplayer.State} state the new state of the player
 * @param {boolean=} crossfade true if should cross fade between states
 * @param {number=} delay the amount of time (in ms) to wait
 */
sampleplayer.FlingPlayer.prototype.setState_ = function (state, loading) {
    console.log('setState_ state: ' + state);

    var self = this;

    self.state_ = state;
    switch (state) {
        case sampleplayer.State.LOADING:
            elementControl.player.hidePlayIcon();
            elementControl.player.loadingStart();
            elementControl.player.hideLogo();
            break;
        case sampleplayer.State.BUFFERING:
            elementControl.player.hideLogo();
            elementControl.player.loadingStart();
            elementControl.player.showTimeline();
            elementControl.player.showTitle();
            break;
        case sampleplayer.State.PLAYING:
            if (!loading) {
                elementControl.player.play();
            }
            elementControl.player.loadingStop();
            elementControl.player.hideLogoStatic();
            break;
        case sampleplayer.State.PAUSED:
            if (volumeset_timeout) {
                clearTimeout(volumeset_timeout);
                volumeset_timeout = null;
            }
            elementControl.player.pause();
            break;
        case sampleplayer.State.STALLED:
            elementControl.player.loadingStart();
            break;
        case sampleplayer.State.DONE:
            elementControl.player.showLogo();
            elementControl.player.hidePlayIconStatic();
            elementControl.player.loadingStop();
            elementControl.player.hideTitleStatic();
            elementControl.player.hideTimelineStatic();
            break;
        case sampleplayer.State.IDLE:
            elementControl.player.showLogo();
            elementControl.player.hidePlayIconStatic();
            elementControl.player.loadingStop();
            elementControl.player.hideTitleStatic();
            elementControl.player.hideTimelineStatic();
            break;
        case sampleplayer.State.LAUNCHING:
            elementControl.player.showLogo();
            elementControl.player.hidePlayIcon();
            elementControl.player.loadingStop();
            break;
        default :
            break;
    }
};

/**
 * Callback called when media has stalled
 *
 */
sampleplayer.FlingPlayer.prototype.onStalled_ = function (event) {
    console.log("onStalled", "readyState =", this.mediaElement_.readyState, "media event:", event);
    if (this.state_ == sampleplayer.State.PLAYING) {
        if (this.mediaElement_.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.setState_(sampleplayer.State.BUFFERING);
        }
    } else if (this.state_ == sampleplayer.State.LOADING) {
        this.loading_time_out_ && clearTimeout(this.loading_time_out_);
        this.setState_(sampleplayer.State.BUFFERING);
    }
};

/**
 * Callback called when media is buffering
 *
 */
sampleplayer.FlingPlayer.prototype.onBuffering_ = function (event) {
    console.log("onBuffering", "readyState =", this.mediaElement_.readyState, "media event:", event);
    if (this.state_ == sampleplayer.State.PLAYING) {
        if (this.mediaElement_.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.setState_(sampleplayer.State.BUFFERING);
        }
    } else if (this.state_ == sampleplayer.State.LOADING) {
        this.loading_time_out_ && clearTimeout(this.loading_time_out_);
        this.setState_(sampleplayer.State.BUFFERING);
    }
};

/**
 * Callback called when media has started playing
 *
 */
sampleplayer.FlingPlayer.prototype.onPlaying_ = function () {
    console.log('onPlaying');
    if (this.state_ == sampleplayer.State.LOADING) {
        this.loading_time_out_ && clearTimeout(this.loading_time_out_);
        this.setState_(sampleplayer.State.PLAYING, true);
    } else {
        this.setState_(sampleplayer.State.PLAYING);
    }
};

/**
 * Callback called when media has been paused
 *
 */
sampleplayer.FlingPlayer.prototype.onPause_ = function () {
    console.log('onPause');
    if (this.state_ != sampleplayer.State.DONE) {
        this.setState_(sampleplayer.State.PAUSED);
    }
};


/**
 * Callback called when media has been stopped
 *
 */
sampleplayer.FlingPlayer.prototype.onStop_ = function () {
    console.log('onStop');
    var self = this;
    self.setState_(sampleplayer.State.DONE);
};


/**
 * Callback called when media has ended
 *
 */
sampleplayer.FlingPlayer.prototype.onEnded_ = function () {
    console.log('onEnded');
    this.setState_(sampleplayer.State.DONE);
};

/**
 * Callback called when media position has changed
 *
 */
sampleplayer.FlingPlayer.prototype.onProgress_ = function () {
    var curTime = this.mediaElement_.currentTime;

    elementControl.player.timeupdate(curTime);
    var buffered = this.mediaElement_.buffered;

    for (var i = 0; i < buffered.length; i++) {
        if (curTime >= buffered.start(i)
            && curTime <= buffered.end(i)) {
            elementControl.player.buffered(buffered.end(i));
        }
    }

};

/**
 * Callback called when user starts seeking
 *
 */
sampleplayer.FlingPlayer.prototype.onSeekStart_ = function () {
    console.log('onSeekStart');
//    clearTimeout(this.seekingTimeout_);
//    this.element_.classList.add('seeking');
};

/**
 * Callback called when user stops seeking
 *
 */
sampleplayer.FlingPlayer.prototype.onSeekEnd_ = function () {
    console.log('onSeekEnd');
};

/**
 * Callback called when media volume has changed - we rely on the pause timer
 * to get us to the right state.  If we are paused for too long, things will
 * close. Otherwise, we can come back, and we start again.
 *
 */
sampleplayer.FlingPlayer.prototype.onVisibilityChange_ = function () {
    console.log('onVisibilityChange');
    if (document.hidden || document.webkitHidden) {
        this.mediaElement_.pause();
    } else {
        this.mediaElement_.play();
    }
};

/**
 * Called to handle an error when the media could not be loaded.
 * fling.MediaManager in the Receiver also listens for this event, and it will
 * notify any senders. We choose to just enter the done state, bring up the
 * finished image and let the user either choose to do something else.  We are
 * trying not to put up errors on the second screen.
 *
 */
sampleplayer.FlingPlayer.prototype.onError_ = function (e) {
    console.log("MEDIA ELEMENT ERROR " + e.target.error.code);
    switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED:
            elementControl.alertBox.show('You aborted the video playback.');
            window.setTimeout(function () {
                window.close();
            }, 10000);
            break;
        case e.target.error.MEDIA_ERR_NETWORK:
            elementControl.alertBox.show('Video download failed due to network error. ');
            window.setTimeout(function () {
                window.close();
            }, 10000);
            break;
        case e.target.error.MEDIA_ERR_DECODE:
            elementControl.alertBox.show('The video playback was aborted due to the video used features can not be supported.');
            window.setTimeout(function () {
                window.close();
            }, 10000);
            break;
        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            elementControl.alertBox.show('The video could not be loaded because the format is not supported. ');
            window.setTimeout(function () {
                window.close();
            }, 10000);
            break;
        default:
            elementControl.alertBox.show('An unknown error occurred.');
            window.setTimeout(function () {
                window.close();
            }, 10000);
            break;
    }
};

/**
 * Get a value from an object multiple levels deep.
 *
 * @param {Object} obj The object.
 * @param {Array} keys The keys keys.
 * @returns {R} the value of the property with the given keys
 * @template R
 */
sampleplayer.getValue_ = function (obj, keys) {
    for (var i = 0; i < keys.length; i++) {
        if (obj === null || obj === undefined) {
            return '';                    // default to an empty string
        } else {
            obj = obj[keys[i]];
        }
    }
    return obj;
};


/***************************/


/**
 * <p>
 * Steps:
 * </p>
 * <ol>
 * <li>Get and start the FlingReceiver</li>
 * <li>Setup the slideshow channel</li>
 * <li>Start the player (this)</li>
 * </ol>
 *
 * @param {Element} element the element to attach the player
 * @constructor
 * @export
 */
window.onload = function () {
    elementControl.init();
    var videoElement = document.getElementById('video');
    //todo
    setTimeout(function(){
        window.player = new sampleplayer.FlingPlayer(videoElement);
    },3000);

    // old version
    /*
    window.flingreceiver.onMediaVolumeChanged = function (event) {
        console.log("onMediaVolumeChanged : " + JSON.stringify(event));


        var volume = Math.round(player.mediaElement_.volume * 10);
        var self = this;
        console.log("MEDIA VOLUME CHANGE " + volume);

        if (volume == 0) {
            elementControl.volumeChange.quiet();
        } else if (volume > 0 && volume <= 10) {
            elementControl.volumeChange.setVolume(volume);
        }
        clearTimeout(volumeset_timeout);
        volumeset_timeout = window.setTimeout(function () {
            elementControl.volumeChange.hideStatic();
            if (player.state_ == sampleplayer.State.PAUSED) {
                elementControl.player.showPlayIcon();
            }
        }, 3000);
    }
    */
};