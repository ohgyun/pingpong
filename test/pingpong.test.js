module('PingPong', {
  setup: function () {
    submap().reset();
  },
  teardown: function () {
    
  }

});

function pp() {
  return PingPong; 
}

function submap() {
  return PingPong.SubscribersMap; 
}

function mockFunction() {
  var f = function () {
    // record count function calls
    f.called = f.called || 0;
    f.called++;  
  };
  return f;
}

function findCallback(topic, callbackId) {
  var callbackObj = submap().find(topic, callbackId);
  return callbackObj && callbackObj.func || undefined;
}

test('subscribe one depth message', function () {
  var callback = mockFunction();
  
  // subscribe() returns subscribed callback id
  var callbackId = pp().subscribe('msg', callback);
  
  equal(findCallback('msg', callbackId), callback,
      'callback saved to subscribers map by callbackId');
});

test('subscribe two depth message', function () {  
  var callback = mockFunction();
  var callbackId = pp().subscribe('some.msg', callback);
  
  equal(findCallback('some.msg', callbackId), callback);
});

test('subscribe multiple messages', function () {
  // subscribe one
  var callbackOne = mockFunction();
  var callbackOneId = pp().subscribe('some.one', callbackOne);
  
  // subscribe two
  var callbackTwo = mockFunction();
  var callbackTwoId = pp().subscribe('some.two', callbackTwo);
  
  equal(findCallback('some.one', callbackOneId), callbackOne);
  equal(findCallback('some.two', callbackTwoId), callbackTwo);
});


test('unsubscribe', function () {
  var callback = mockFunction();
  var callbackId = pp().subscribe('some.one', callback);
  
  equal(callback, submap().map()['some']['one'][callbackId]);
  
  // unsubscribe specific callback by id
  pp().unsubscribe('some.one', callbackId);
  
  // TODO HERE!!!!
  equal(findCallback('some.one', callbackId), undefined);
});


test('publish', function () {
  var callback = mockFunction();
  pp().subscribe('some.one', callback);
  
  pp().publish('some.one');
  
  equal(callback.called, 1, 'callback called');
});

test('subscribe with wildcard', function () {
  var callback = mockFunction();
  pp().subscribe('some.*', callback); // subscribe all children of some
  
  pp().publish('some'); // not subscribed
  pp().publish('some.one');
  pp().publish('some.two');
  pp().publish('some.two.three');
  
  equal(callback.called, 3);
});

test('subscribe all messages', function () {
  var callback = mockFunction();
  pp().subscribe('*', callback);
  
  pp().publish('one');
  pp().publish('two');
  pp().publish('one.two.three');
  
  equal(callback.called, 3);
});

