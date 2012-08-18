//-----------------------------------------------------
//- pingpong.js - Javascript Messaging Library
//- Copyright 2012 Ohgyun Ahn (ohgyun@gmail.com)
//- MIT Licensed
//-----------------------------------------------------
(function (glob) {

  'use strict';

  var pingpong = {

    version: '0.1',

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
    },

    namespace: function (namespace) {
      return Namespace.getInstance(namespace);
    }

  };


  var Namespace = function (namespace) {
    this._namespace = namespace;
  },
  namespaceProto = Namespace.prototype;

  Namespace._instances = {};
  Namespace.getInstance = function (namespace) {
    var ins = this._instances;
    
    ins[namespace] = ins[namespace] || new Namespace(namespace);
    
    return ins[namespace];
  };
  
  (function defineNamespaceMethods() {
    
    for (var i in pingpong) {
      if (pingpong.hasOwnProperty(i) &&
          typeof pingpong[i] === 'function') {
          
        (function (method) {
          namespaceProto[method] = function () {
            var topic = arguments[0] || '',
              namespacedTopic = this._namespace + Topic.SEPERATOR + topic,
              args = Array.prototype.slice.call(arguments, 1);
  
            args.unshift(namespacedTopic);
  
            return pingpong[method].apply(pingpong, args);
          }
        }(i));
  
      };
    }
    
  }());


  var Topic = function (topic) {
    this._topic = topic;
    this._topicPieces = topic.split(Topic.SEPERATOR);

    this.validate();
  },
  topicProto = Topic.prototype;
  
  Topic.SEPERATOR = '.';
  Topic.WILDCARD = '*';
  Topic.VALIDATOR = /^\w+$/;
  
  topicProto.validate = function () {
    this.eachTopicPiece(function (topicPiece, isLast) {
      if ( ! Topic.VALIDATOR.test(topicPiece)) {
        if (isLast && topicPiece === Topic.WILDCARD) {
          // Pass if last wildcard
        } else {
          error.throwError('INVALID_TOPIC');   
        }
      };
    });
  };
  topicProto.eachTopicPiece = function (callback, context) {
    var len = this._topicPieces.length,
      topicPiece,
      isLast,
      isBreak = false;
      
    for (var i = 0; i < len; i++) {
      topicPiece = this._topicPieces[i];
      isLast = i === (len-1);
      isBreak = callback.call(context, topicPiece, isLast);
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
      
      this._eachTopicPieceMap(oTopic, function (topicPiece, isLast, parentMap) {
        parentMap[topicPiece] = parentMap[topicPiece] || this._createMap();
      });
    },
    
    _createRootWildcardHandlers: function () {
      this._map[Topic.WILDCARD] = this._map[Topic.WILDCARD] || new Handlers();
    },
    
    /**
     * Iterate each map of message
     * @param {Object} oTopic
     * @param {function (topicPiece, isLast, parentMap)} callback
     *    {string} topicPiece The message block.
     *    {boolean} isLast Is last message?
     *    {Object} parentMap The object that include the current message.
     */
    _eachTopicPieceMap: function (oTopic, callback) {
      var currentMap = this._map;
      
      oTopic.eachTopicPiece(function (topicPiece, isLast) {
      
        callback.call(this, topicPiece, isLast, currentMap);
        
        currentMap = currentMap[topicPiece];
        
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

      this._eachTopicPieceMap(oTopic, function (topicPiece, isLast, parentMap) {
        if (isLast) {
          if (topicPiece === Topic.WILDCARD) {
            handlers = parentMap[Topic.WILDCARD];
            
          } else {
            handlers = parentMap[topicPiece][this.HANDLERS_KEY];
          }
        }
      });
      
      return handlers;
    },
    
    runHandlers: function (oTopic, datas) {
      this._eachTopicPieceMap(oTopic, function (topicPiece, isLast, parentMap) {
        this._runWildcardHandlers(parentMap, datas);
        this._runHandlersIfLastMsg(topicPiece, isLast, parentMap, datas);  
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
        
    _runHandlersIfLastMsg: function (topicPiece, isLast, parentMap, datas) {
      if ( ! isLast) { return; }
      
      var oHandlers = parentMap[topicPiece] && parentMap[topicPiece][this.HANDLERS_KEY];
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
  },
  handlersProto = Handlers.prototype;

  handlersProto.add = function (oHandler) {
    this._handlers.push(oHandler);
  };
  handlersProto.runAll = function (datas) {
    this.eachHandler(function (oHandler, idx) {
      oHandler.run(datas);
    });
  };
  handlersProto.eachHandler = function (callback) {
    var len = this._handlers.length,
      oHandler;

    for (var i = 0; i < len; i++) {
      oHandler = this._handlers[i];
      callback.call(this, oHandler, i);
    }
  };
  handlersProto.remove = function (handler) {
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
  },
  handlerProto = Handler.prototype;

  handlerProto.run = function (datas) {
    datas.push(this._topic);
    this._handler.apply(this._context, datas);
  };
  handlerProto.isEqual = function (handler) {
    return this._handler === handler;
  };
  

  var error = { 
    throwError: function (errorKey) {
      throw '[pingpong] ' + this[errorKey];
    },

    INVALID_TOPIC: 'Topic should be character'
  };
  
  
  // export
  pingpong.subscribersMap = subscribersMap;
  glob.pingpong = pingpong;
  
}(this));
