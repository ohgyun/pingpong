/**
 * PingPong - Javascript Messaging Library
 * Copyright 2012 Ohgyun Ahn (ohgyun@gmail.com)
 * MIT Licensed
 */
(function () {
  
  var pingpong = {
    
    subscribe: function (topic, handler, context) {
      var oTopic = new Topic(topic),
        oHandler = new Handler(handler, context);
        
      subscribersMap.register(oTopic, oHandler); 
    },
    
    publish: function (topic) {
      var oTopic = new Topic(topic),
        datas = Array.prototype.slice.call(arguments, 1);
        
      subscribersMap.runHandlers(oTopic, datas);
    }
    
  };
  
  
  var Topic = function (topic) {
    var SEPERATOR = '.';
    this._topic = topic;
    this._topicArr = topic.split(SEPERATOR);
  };
  Topic.prototype.eachMsg = function (callback, context) {
    var len = this._topicArr.length,
      msg,
      isLast,
      isBreak = false;
      
    for (var i = 0; i < len; i++) {
      msg = this._topicArr[i];
      isLast = i === (len-1);
      isBreak = callback.call(context, msg, isLast);
      if (isBreak) { break; }
    }
  };


  var subscribersMap = {

    WILDCARD: '*',
    
    HANDLERS_KEY: '~handlers',
    
    /*
     * {
     *   "*": Handlers,
     *   "some": {
     *     "*": Handlers,
     *     "~handlers": Handlers,
     *     "one": {
     *       "*": Handlers,
     *       "~handlers": Handlers,
     *       "two": {}
     *     },
     *   }
     * } 
     */
    _map: {},
    
    register: function (oTopic, oHandler) {
      this._structureMap(oTopic);
      var handlers = this._findHandlers(oTopic);
      handlers.add(oHandler);
    },
    
    _structureMap: function (oTopic) {
      this._createRootWildcardHandlers();
      
      this._eachMsgMap(oTopic, function (msg, isLast, parentMap) {
        parentMap[msg] = parentMap[msg] || this._createMap();
      });
    },
    
    _createRootWildcardHandlers: function () {
      this._map[this.WILDCARD] = this._map[this.WILDCARD] || new Handlers();
    },
    
    /**
     * Iterate each map of message
     * @param {Object} oTopic
     * @param {function (msg, isLast, parentMap)} callback
     *    {string} msg The message block.
     *    {boolean} isLast Is last message?
     *    {Object} parentMap The object that include the current message.
     */
    _eachMsgMap: function (oTopic, callback) {
      var currentMap = this._map;
      
      oTopic.eachMsg(function (msg, isLast) {
      
        result = callback.call(this, msg, isLast, currentMap);
        
        currentMap = currentMap[msg];
        
        if ( ! currentMap) {
          return true; // break
        }
        
      }, this);
    },
    
    _createMap: function () {
      var map = {};
      map[this.WILDCARD] = new Handlers();
      map[this.HANDLERS_KEY] = new Handlers();
      return map;
    },
    
    _findHandlers: function (oTopic) {
      var handlers = null;

      this._eachMsgMap(oTopic, function (msg, isLast, parentMap) {
        if (isLast) {
          if (msg === this.WILDCARD) {
            handlers = parentMap[this.WILDCARD];
            
          } else {
            handlers = parentMap[msg][this.HANDLERS_KEY];
          }
        }
      });
      
      return handlers;
    },
    
    runHandlers: function (oTopic, datas) {
      this._eachMsgMap(oTopic, function (msg, isLast, parentMap) {
        this._runWildcardHandlers(parentMap, datas);
        this._runHandlersIfLastMsg(msg, isLast, parentMap, datas);  
      });
    },
    
    _runWildcardHandlers: function (parentMap, datas) {
      this._runHandlers(parentMap[this.WILDCARD], datas);
    },

    _runHandlers: function (oHandlers, datas) {
      if (oHandlers) {
        oHandlers.runAll(datas); 
      }
    },
        
    _runHandlersIfLastMsg: function (msg, isLast, parentMap, datas) {
      if ( ! isLast) { return; }
      
      var oHandlers = parentMap[msg] && parentMap[msg][this.HANDLERS_KEY];
      if (oHandlers) {
        this._runHandlers(oHandlers, datas); 
      }
    },
    
    reset: function () {
      this._map = {}; 
    }
    
  };

  
  var Handlers = function () {
    this._handlers = [];
  };
  Handlers.prototype.add = function (oHandler) {
    this._handlers.push(oHandler);
  };
  Handlers.prototype.runAll = function (datas) {
    var len = this._handlers.length,
      handler;
      
    for (var i = 0; i < len; i++) {
      handler = this._handlers[i];
      handler.run(datas);
    }
  };


  var Handler = function (handler, context) {
    this._handler = handler;
    this._context = context || this;
  };
  Handler.prototype.run = function (datas) {
    this._handler.apply(this._context, datas);
  };
  
  
  pingpong.subscribersMap = subscribersMap;
  window.pingpong = pingpong;
  
  
}());