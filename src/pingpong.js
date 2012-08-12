/**
 * PingPong - Javascript Messaging Library
 * Copyright 2012 Ohgyun Ahn (ohgyun@gmail.com)
 * MIT Licensed
 */
(function () {
  
  
  var
  
    WILDCARD = '*',
    
    SEPERATOR = '.',
    
    PingPong = {

      /**
       * Subscribe topic.
       * You can seperate topics by dot(.), and subscribe all topics using wildcard(*).
       * e.g. 'some.topic.*'
       *
       * @param {string} topic Topic
       * @param {function(?Object, string)} callback(data, topic)
       * @return {string} Subscribed callback id
       */
      subscribe: function (topic, callback) {
        var callbackObj = Callback.create(callback),
          callbackId = callbackObj.id;
          
        SubscribersMap.add(topic, callbackId, callbackObj);
        return callbackId;
      },  
    
      /**
       * Unsubscribe specific callback
       * @param {string} topic
       * @param {string} callbackId
       */
      unsubscribe: function (topic, callbackId) {
        SubscribersMap.remove(topic, callbackId);
      },
    
      /**
       * Publish topic with data
       * @param {string} topic The topic has seperator dot('.'), and does not recommand include '*'.
       * @param {?Object=} data
       */
      publish: function (topic, data) {
        var t = this,
          runCallback = function (currentMap) {
            for (var callbackId in currentMap) {
              if (currentMap.hasOwnProperty(callbackId)) {
                 if (typeof currentMap[callbackId] === 'function') {
                    currentMap[callbackId](data, topic); 
                 }
              } 
            }
          };
        
        SubscribersMap.eachDepth(topic, function (msgName, currentMap, parentMap, isLastDepth) {
          runCallback(parentMap[WILDCARD]);
          
          if (isLastDepth) {
            runCallback(currentMap);
          }
        });
      }
      
    },
    
    
    /**
     * Subscribers map.
     * @type {Object.<string, Object.<string, function>}
     * @example If you subscribe 'some.one.*' and 'some.two',..
     *     {
     *       some: {
     *         one: {
     *           *: {
     *             callbackId: callback
     *           }
     *         },
     *         two: {
     *           callbackId: callback
     *         }
     *       }
     *     }
     */
    SubscribersMap = {
    
      _WILDCARD: '*',
      
      _SEPERATOR: '.',
    
      _CALLBACKS_KEY: ':callbacks',
      
      _map: {},
      
      add: function (topic, callbackId, callbackObj) {
        var topics = this._splitTopics(topic);
        this._structureMap(topics);
        this._getCallbacks(topics)[callbackId] = callbackObj;
      },
      
      _splitTopics: function (topic) {
        return topic.split(this._SEPERATOR);
      },
      
      _structureMap: function (topics) {
        var len = topics.length,
          msgName,
          currentMap = this._map;
          
        for (var i = 0; i < len; i++) {
          msgName = topics[i];
          currentMap[msgName] = currentMap[msgName] || this._createMap();
          currentMap = currentMap[msgName];
        }
      },
      
      _createMap: function() {
        var map = {};
        map[this._WILDCARD] = {};
        map[this._CALLBACKS_KEY] = {};
        return map;
      },
      
      _getCallbacks: function(topics) {
        var len = topics.length,
          msgName,
          currentMap = this._map;
        
        for (var i = 0; i < len; i++) {
          msgName = topics[i];
          currentMap = currentMap[msgName];
        }
        
        return currentMap[this._CALLBACKS_KEY];
      },
      
      eachDepth: function (topic, callback) {
        var parentMap = this._map,
          topics = this._splitTopic(topic),
          len = topics.length,
          msgName,
          isLastDepth,
          currentMap;
        
        for (var i = 0; i < len; i++) {
          msgName = topics[i];
          isLastDepth = i === (len-1);
          currentMap = parentMap[msgName];
          
          if ( ! currentMap) { break; }
                
          callback.call(this, msgName, currentMap, parentMap, isLastDepth); 
          
          parentMap = currentMap;
        }      
      },
      
      remove: function (topic, callbackId) {
        var topics = this._splitTopics(topic),
          callbacks = this._getCallbacks(topics);
          
        delete callbacks[callbackId];
      },
      
      map: function () {
        return this._map; 
      },
      
      find: function (topic, callbackId) {
        var topics = this._splitTopics(topic);
        return this._getCallbacks(topics)[callbackId];
      },
      
      reset: function () {
        this._map = {}; 
      }
    
    },
    
    Callback = {
      
      create: function (func, context) {
        return {
          id: this.guid(),
          func: func,
          run: function (data) {
            this.func.call(context || this, data);
          }
        };
      },
      
      guid : function () {
        return 'p' + (Math.random() * (1 << 30)).toString(32).replace('.', ''); 
      }
      
    };  
  
  
  // export 
  PingPong.SubscribersMap = SubscribersMap;
  window.PingPong = PingPong;

  
  
}());