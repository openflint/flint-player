"use strict"

/*
* 协议数据处理
**/
var Protocol = {
    "buildJSONProtocol": function(namespace, senderId, data){
        return JSON.stringify({
            "namespace": namespace,
            "senderId": senderId,
            "data": JSON.stringify(data)
        });
    }
};

/*
* 与sender端的消息通道类
**/
var MessageChannel = function(channelId){
    var self = this;
    var wsServer = "ws://127.0.0.1:9439/channels/"+channelId,
    // var wsServer = "ws://127.0.0.1:9439/receiver",
        msg = null,
        senderId = null,
        messageType = null;

    var ws = null;
        ws = new WebSocket(wsServer);
    ws.onopen = function (evt) {
        console.info("-------------------------------------> player onopen");
    }; 
    ws.onclose = function (evt) { 
        console.info("-------------------------------------> player onclose");
    }; 
    ws.onmessage = function (evt) { 
        console.info("-------------------------------------> player onmessage evt.data : ", evt.data);
        msg = JSON.parse(evt.data);
        console.info("-------------------------------------> player onmessage: ", msg);
        if("senderId" in msg){
            senderId = msg.senderId;
            messageType = msg.type;
            
            ("onmessage" in self)&&(msg)&&self.onmessage(msg);
        }
    }; 
    ws.onerror = function (evt) {
        console.info("-------------------------------------> player onerror");
    };

    self.send = function(data, broadcast){
        console.info("-------------------------------------> player send: ", data);
        var messageData = {};
        if(broadcast){
            messageData["senderId"] = "*:*"; 
        }else{
            messageData["senderId"] = senderId; 
        }
        messageData["data"] = data;
        messageData = JSON.stringify(messageData);
        if(ws&& ws.readyState==1){
            ws.send(messageData);
        }else if(ws&& ws.readyState==0){
            setTimeout(function(){
                self.send(messageData);
            }, 50);
        }else{
            throw Error("Underlying websocket is not open");
        }
    };

    self.on = function(type, func){
        self["on"+type] = func;
    }
};

/*
* 播放器类
* How to use:
* //1. Create MediaPlayer Instance
* var mediaPlayer = new MediaPlayer("{video element id}");
* //Listen message from sender, data is a json object
* mediaPlayer.on("message", function(data){
*       
* });
* //send message to receiver
* mediaPlayer.send("{String}");
* @param {String} video Element id
**/
var MediaPlayer = function(videoId){
    var self = this;
    self.status = "IDLE";
    self.playerState = "IDLE";
    self.title = "";
    self.subtitle = "";
    self.mediaMetadata = null;
    //----------------------------------------------
    self.requestId = 0;
    self.requestIdLoad = 0;
    self.requestIdPause = 0;
    self.requestIdPlay = 0;
    self.requestIdSetVolume = 0;
    self.requestIdSeek = 0;
    self.requestIdPing = 0;
    self.requestIdGetStatus = 0;

    var channelId = guid();
    
    console.info("---------------------------------------------------> player receiverDaemon: ");
    receiverDaemon.on("opened", function(){
        var wsAddress = "ws://"+receiverDaemon.localIpAddress+":9439/channels/"+channelId;
        console.info("-------------------------------------> player ws addr: ", wsAddress);
        receiverDaemon.send({"type":"additionaldata","additionaldata":{ "serverId": wsAddress}});
    });
    
    var video = document.getElementById(videoId);
    if(video==null){
        throw Error("video element undefined!");
    }

    function syncExecute (readyCallback){
        if(self.status=="READY"){
            if(typeof(readyCallback!="undefined"&&readyCallback!=null)){
                readyCallback();
            }
        }else if(self.status=="IDLE"){
            return;
        }else if(self.status=="LOADDING"){
            setTimeout(function(){
                syncExecute(readyCallback);
            },50);
        }
    };    

    /*
    * 创建消息通道对象
    **/
    var channel = new MessageChannel(channelId);
    
    self.load = function(url, videoType, title, subtitle, mediaMetadata){
        self.mediaMetadata = mediaMetadata;

        self.status = "LOADDING";
        var source = document.createElement('source');
        source.src = url;
        if(typeof(videoType)!="undefined"&&videoType){
            source.type = videoType;
        }
        video.innerHTML="";
        video.appendChild(source);
        video.load();

        if(typeof(title)!="undefined"&&!title){
            self.title = title;
        }
        if(typeof(subtitle)!="undefined"&&!subtitle){
            self.subtitle = subtitle;
        }
        video.autoplay = true;
        video.controls = false;
    };

    self.pause = function(){
        syncExecute(function(){
            video.pause();
        });
    };

    self.play = function(){
        syncExecute(function(){
            video.play();
        });
    };

    self.seek = function(value){
        syncExecute(function(){
            var seekToTime = value;
            if(seekToTime < 0 || seekToTime > video.duration){
                return;
            }
            video.currentTime = seekToTime;
        });
    };

    self.volumechange = function(num){
        syncExecute(function(){
            video.volume = num;
        });
    };

    /*
    * 消息报告类
    * 用于将video的状态发送给sender，完成与sender的heartbeat
    **/
    var MessageReport = function(){
        var namespace = "urn:x-cast:com.google.cast.media",  
            senderId = "*:*";
            
        function loadData(){
            return {
                "type": "MEDIA_STATUS",
                "status": [
                    {
                        "mediaSessionId": 1,
                        "playbackRate": video.playbackRate,
                        "currentTime": video.currentTime,
                        "duration": video.duration,
                        "supportedMediaCommands": 15,
                        "volume": {
                            "level": video.volume,
                            "muted": video.muted
                        }
                    }
                ],
                "requestId": self.requestId
            };
        }

        this.idle = function(idleReason){
            var messageData = loadData();
            messageData.status[0].playerState = "IDLE";
            messageData.status[0].idleReason = idleReason;
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        };
        this.loadmetadata = function(){
            var messageData = loadData();
            messageData["requestId"] = self.requestIdLoad;

            messageData.status[0].playerState = "PLAYING";
            messageData.status[0].media = {
                "streamType": self.mediaMetadata.media.streamType,
                "duration": video.duration,
                "contentType": self.mediaMetadata.media.contentType,
                "contentId": self.mediaMetadata.media.contentId,
                "metadata":{
                    // "studio": self.mediaMetadata.media.metadata.studio,
                    "title": self.mediaMetadata.media.metadata.title,
                    "subtitle": self.mediaMetadata.media.metadata.subtitle,
                    "images": self.mediaMetadata.media.metadata.images,
                    "metadataType": self.mediaMetadata.media.metadata.metadataType
                }
            };
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        };
        this.playing = function(){
            var messageData = loadData();
            messageData["requestId"] = self.requestIdPlay;
            self.playerState = messageData.status[0].playerState = "PLAYING";
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        };
        this.paused = function(){
            var messageData = loadData();
            messageData["requestId"] = self.requestIdPause;
            self.playerState = messageData.status[0].playerState = "PAUSED";
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        };
        this.buffering = function(){
            var messageData = loadData();
            messageData.status[0].playerState = "BUFFERING";
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        };

        this.syncPlayerState = function(type){
            var messageData = loadData();
            if(type=="seeked"){
                messageData["requestId"] = self.requestIdSeek;
            }else if(type=="volumechange"){
                messageData["requestId"] = self.requestIdSetVolume;
            }
            if(self.mediaMetadata!=null){
                messageData.status[0].media = {
                    "streamType": self.mediaMetadata.media.streamType,
                    "duration": video.duration,
                    "contentType": self.mediaMetadata.media.contentType,
                    "contentId": self.mediaMetadata.media.contentId,
                    "metadata":{
                        "title": self.mediaMetadata.media.metadata.title,
                        "subtitle": self.mediaMetadata.media.metadata.subtitle,
                        "images": self.mediaMetadata.media.metadata.images,
                        "metadataType": self.mediaMetadata.media.metadata.metadataType
                    }
                };
            }
            messageData.status[0].playerState = self.playerState;
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, messageData));
        }

        this.pong = function(){
            channel.send(Protocol.buildJSONProtocol(namespace, senderId, {"type":"PONG"}));
        };
    };
    //实例化MessageReport对象
    var messageReport = new MessageReport();

    /*
    * 监听sender端消息
    **/
    channel.on("message", function(msg){
        var messageData = null;

        switch(msg.type){
            case "senderConnected":
            case "senderDisconnected":
                break;
            case "message":
                messageData = JSON.parse(msg.data);
                console.info("=================================channel message messageData: ", messageData.data);
                self.requestId = messageData.requestId;
                messageData = JSON.parse(messageData.data);
                if("type" in messageData){
                    switch(messageData.type){
                        case "LOAD":
                            (self.requestId)&&(self.requestIdLoad = self.requestId);
                            self.load(messageData.media.contentId, messageData.media.contentType, messageData.media.metadata.title, messageData.media.metadata.subtitle, messageData);
                            break;

                        case "PAUSE":
                            (self.requestId)&&(self.requestIdPause = self.requestId);
                            self.pause();
                            break;

                        case "PLAY":
                            (self.requestId)&&(self.requestIdPlay = self.requestId);
                            self.play();
                            break;

                        case "SET_VOLUME":
                            (self.requestId)&&(self.requestIdSetVolume = self.requestId);
                            self.volumechange(messageData.volume.level);
                            break;

                        case "SEEK":
                            (self.requestId)&&(self.requestIdSeek = self.requestId);
                            self.seek(messageData.currentTime);
                            break;

                        case "PING": 
                            (self.requestId)&&(self.requestIdPing = self.requestId);
                            messageReport.pong();
                            break;

                        case "GET_STATUS":
                            (self.requestId)&&(self.requestIdGetStatus = self.requestId);
                            messageReport.syncPlayerState();
                            break;
                    }
                }
                break;
        }
        ("onmessage" in self)&&self.onmessage(msg);
    });

    //video event linstener 
    video.addEventListener("emptied", function(e){
        messageReport.idle("NONE");
    });
    video.addEventListener("loadedmetadata", function(e){
        self.status = "READY";
        messageReport.loadmetadata();
    });
    video.addEventListener("play", function(e){
        messageReport.playing();
    });
    video.addEventListener("playing", function(e){
        messageReport.playing();
    });
    video.addEventListener("waiting", function(e){
        messageReport.buffering();
    });
    video.addEventListener("pause", function(e){
        messageReport.paused();
    });
    video.addEventListener("ended", function(e){
        messageReport.idle("FINISHED");
    });
    video.addEventListener("volumechange", function(e){
        messageReport.syncPlayerState("volumechange");
    });
    video.addEventListener("seeked", function(e){
        messageReport.syncPlayerState("seeked");
    });
    video.addEventListener("canplay", function(e){
        messageReport.syncPlayerState();
    });

    video.addEventListener("error", function(e){
        messageReport.idle("ERROR");
    });
    video.addEventListener("abort", function(e){
        messageReport.idle("INTERRUPTED");
    });

    self.sendMessage = channel.send;

    self.on = function(type, func){
        self["on"+type] = func;
    };
};