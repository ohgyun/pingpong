/**
 * pingpong - Javascript Messaging Library
 * Copyright 2012 Ohgyun Ahn (ohgyun@gmail.com)
 * MIT Licensed
 */
(function () {
  
  var pingpong = {

    version: '0.1-dev',

    api: '',

    /**
     * Subscribe topic.
     * @param {string} topic
     * @param {function ( .. , topicSent, topicReceived)} handler
     * @param {Object} context
     */
    subscribe: function (topic, handler, context) {
      var oTopic = new Topic(topic),
        oHandler = new Handler(topic, handler, context);
        
      subscribersMap.register(oTopic, oHandler); 
    },
    
    /**
     * Publish topic.
     * @param {string} topic
     * @param {Object..} datas
     */
    publish: function (topic) {
      var oTopic = new Topic(topic),
        datas = Array.prototype.slice.call(arguments, 1);
      
      // Add topic sent info to datas
      datas.push(topic);

      subscribersMap.runHandlers(oTopic, datas);
    },

		/**
		 * Unsubscribe handler of topic.
		 * @param {string} topic
		 * @param {function} handler
		 */
		unsubscribe: function (topic, handler) {
			var oTopic = new Topic(topic);

			subscribersMap.remove(oTopic, handler);
		},

    ping: function () {
      this.publish.apply(this, arguments);
		},

		pong: function () {
      this.subscribe.apply(this, arguments);
		},
		
		pung: function () {
		  this.unsubscribe.apply(this, arguments);
		}
    
  };
  
  
  var Topic = function (topic) {
    this._topic = topic;
    this._topicArr = topic.split(Topic.SEPERATOR);

    this.validate();
  };
  
  Topic.SEPERATOR = '.';
  Topic.WILDCARD = '*';
  Topic.VALIDATOR = /^\w+$/;
  
  Topic.prototype.validate = function () {
    this.eachMsg(function (msg, isLast) {
      if ( ! Topic.VALIDATOR.test(msg)) {
        if (isLast && msg === Topic.WILDCARD) {
          // Pass if last wildcard
        } else {
          error.throw('TOPIC');   
        }
      };
    });
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
      this._map[Topic.WILDCARD] = this._map[Topic.WILDCARD] || new Handlers();
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
      map[Topic.WILDCARD] = new Handlers();
      map[this.HANDLERS_KEY] = new Handlers();
      return map;
    },
    
    _findHandlers: function (oTopic) {
      var handlers = null;

      this._eachMsgMap(oTopic, function (msg, isLast, parentMap) {
        if (isLast) {
          if (msg === Topic.WILDCARD) {
            handlers = parentMap[Topic.WILDCARD];
            
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
      this._runHandlers(parentMap[Topic.WILDCARD], datas);
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
    
		remove: function (oTopic, handler) {
			var oHandlers = this._findHandlers(oTopic);
			if (oHandlers) {
				oHandlers.remove(handler);
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
	  this.eachHandler(function (oHandler, idx) {
      oHandler.run(datas);
    });
  };
	Handlers.prototype.eachHandler = function (callback) {
		var len = this._handlers.length,
			oHandler;

		for (var i = 0; i < len; i++) {
			oHandler = this._handlers[i];
			callback.call(this, oHandler, i);
		}
	};
	Handlers.prototype.remove = function (handler) {
	  var idxToRemove = -1;
    this.eachHandler(function (oHandler, idx) {
      if (oHandler.isEqual(handler)) {
        idxToRemove = idx;
			}
		});
		
		if (idxToRemove > -1) {
      this._handlers.splice(idxToRemove, 1);
		}
	};


  var Handler = function (topic, handler, context) {
    this._topic = topic;
    this._handler = handler;
    this._context = context || this;
  };
  Handler.prototype.run = function (datas) {
    datas.push(this._topic);
    this._handler.apply(this._context, datas);
  };
	Handler.prototype.isEqual = function (handler) {
    return this._handler === handler;
	};
  

  var error = { 
    throw: function (msgKey) {
      throw '[pingpong] ' + this[msgKey];
    },

    TOPIC: 'Topic should be character'
  };
  
  // export
  pingpong.subscribersMap = subscribersMap;
  window.pingpong = pingpong;
  
	// TODO
	// 1. change name msg to topicPiece
}());
