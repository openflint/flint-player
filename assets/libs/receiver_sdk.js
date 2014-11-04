"use strict"

/**
* Generate a globally unique identifier(GUID) 
* @return {String} The GUID
*/
function guid(){
    function s4(){
        return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16).substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();  
};

/**
* Receiver Daemon Class
* 创建并维护与Fling Daemon的通信。与Fling Daemon通过心跳判断Receiver应用是否还在运行。
* How to use: 
* //1. Create Receiver Daemon Instance
* var receiverDaemon = new ReceiverDaemon();
* //2. open receiver daemon
* receiverDaemon.open();
* //3. linsten receiver daemon open event.
* receiverDaemon.on("opened", function(){
*   //do something after Receiver Daemon opened
* });
*/
var ReceiverDaemon = function(){
    var self = this;

    // var wsServer = "ws://localhost:9431/receiver/"+appid,
    var wsServer = "ws://localhost:9431/receiver",
        ws = null,
        sender = {
            "count":0,
            "list":{}
        };
    console.info("------------------------------------------>flingd: ", wsServer);
    self.appid = (typeof(appid)=="undefined"||!appid)?"~browser":appid;
    self._onopen = function(evt){
        self.send({"type":"register"});
    };

    self._onclose = function(evt){
        self.send({"type":"unregister"});
        ("onclosed" in self)&&(self.onclose());
    };

    self._onmessage = function(data){
        if(data!=null){
            switch(data.type){
                case "startheartbeat": 
                    break;
                case "registerok":
                    self.localIpAddress = data["service_info"]["ip"][0];
                    self.uuid = data["service_info"]["uuid"];
                    self.deviceName = data["service_info"]["device_name"];
                    console.info("=========================================>flingd has onopened: " ,("onopend" in self));
                    ("onopened" in self)&&(self.onopened());
                    break;
                case "heartbeat":
                    if(data.heartbeat == "ping"){
                        self.send({"type":"heartbeat","heartbeat":"pong"});
                    }else{
                        self.send({"type":"heartbeat","heartbeat":"ping"});
                    }
                    break;
                case "senderconnected":
                    self._onsenderchange(data, "senderconnected");
                    break;
                case "senderdisconnected":
                    self._onsenderchange(data, "senderdisconnected");
                    break;
                default:
                    ("onmessage" in self)&&(self.onmessage(data));
                    break;
            }
        }
    };

    self._onsenderchange = function(data, type){
        var t = new Date().getTime();

        if(data=="senderconnected"){
            sender.list[data.token] = {
                "token": data.token,
                "timestamp": t
            };
        }else{
            delete sender.list[data.token];
        }
        sender.count = Object.keys(sender.list).length;
        ("on"+type in self)&&(self["on"+type](sender));
    };

    self._onerror = function(evt){
        ("onerror" in self)&&(self.onerror(evt));
    }

    /**
    * Start Receiver Daemon
    */
    self.open = function(){
        if(ws==null || (ws.readyState==2||ws.readyState==3) ){
            if(ws==null || !ws.readyState!=1){
                ws = new WebSocket(wsServer);
                ws.onopen = function (evt) {
                    self._onopen(evt);
                }; 
                ws.onclose = function (evt) { 
                    console.info("----------------------------------------------->flingd onclose....");
                    self._onclose(evt);
                }; 
                ws.onmessage = function (evt) { 
                    console.info("----------------------------------------------->flingd onmessage....", evt.data);
                    if(evt.data){
                        var data = JSON.parse(evt.data);
                        self._onmessage(data);
                    }
                }; 
                ws.onerror = function (evt) {
                    console.info("----------------------------------------------->flingd onerror....", evt);
                    evt.message = "Underlying websocket is not open";
                    evt.socketReadyState = evt.target.readyState;
                    self._onerror(evt);
                };
            }
        }
    };

    /**
    * Close Receiver Daemon
    */
    self.close = function(){
        ws.close();
    };

    /**
    * Send message to Fling Daemon
    * @param {JSON objects} 任意数据
    */
    self.send = function(data){
        data["appid"] = self.appid;
        data = JSON.stringify(data);
        console.info("----------------------------------------------->flingd send....", data);
        if(ws&& ws.readyState==1){
            ws.send(data);
        }else if(ws&& ws.readyState==0){
            var selfSend = this;
            setTimeout(function(){
                selfSend.send(data);
            }, 50);
        }else {
            var evt = {};
            evt.message = "Underlying websocket is not open";
            evt.socketReadyState = 3;
            self._onerror(evt);
        }
    };

    /**
    * 事件回调
    * @param {String} 事件类型，支持的事件有message|open|close|senderconnected|senderdisconnected|error
    *                 message: 收到Fling Daemon的数据时调用，并向回调函数中传递收到的数据（JSON object）
                      opened: 与Fling Daemon建立连接后调用
                      closed: 与Fling Daemon断开链接后调用
                      senderconnected: 有sender链接后调用
                      senderdisconnected: 有sender断开链接后调用
                      error: 当与Fling Daemon连接出现异常时调用
    * @param {function} callback function
    */
    self.on = function(type, func){
        self["on"+type] = func;
    };
};