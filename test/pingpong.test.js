module('pingpong', {
  setup: function () {
    submap().reset();
  },
  teardown: function () {
    
  }

});

function pp() {
  return pingpong; 
}

function submap() {
  return pingpong.subscribersMap; 
}

function mockFunction() {
  var f = function () {
    // record count function calls
    f.called = f.called || 0;
    f.called++;  
  };
  return f;
}

test('subscribe one depth message', function () {
  var callback = mockFunction();

  pp().subscribe('msg', callback, this);
  
  pp().publish('msg');
  
  equal(callback.called, 1);
});

test('subscribe two depth message', function () {  
  var callback = mockFunction();
  
  pp().subscribe('some.msg', callback);
  
  pp().publish('msg');
  
  equal(callback.called, undefined);
});

test('subscribe multiple messages', function () {
  // subscribe one
  var callbackOne = mockFunction();
  pp().subscribe('some.one', callbackOne);
  
  // subscribe two
  var callbackTwo = mockFunction();
  pp().subscribe('some.two', callbackTwo);
  
  pp().publish('some.one');
  
  equal(callbackOne.called, 1);
  equal(callbackTwo.called, undefined);
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

test('pub/sub with params', function () {
  var a, b;
  pp().subscribe('one.*', function (paramA, paramB) {
    a = paramA;
    b = paramB;
  });
  
  pp().publish('one.two.three', 10, 20);
  
  equal(a, 10);
  equal(b, 20);
});

test('subscribe with topic param', function () {
  var a, b, c;
  pp().subscribe('*', function (paramA, topicSent, topicReceived) {
    a = paramA;
    b = topicSent;
    c = topicReceived;
  });

  pp().publish('one.two', 10);

  equal(a, 10);
  // Last two parameters contains topic information
  equal(b, 'one.two');
  equal(c, '*');
});

test('unsubscribe handler', function () {
  var callback = mockFunction();
  pp().subscribe('some', callback);

  pp().publish('some');
  equal(callback.called, 1);

  pp().unsubscribe('some', callback);

  pp().publish('some');
  equal(callback.called, 1);
});

test('unsubscribe wildcard handler', function () {
  var callback = mockFunction();
  pp().subscribe('some.*', callback);

  pp().publish('some.one');
  equal(callback.called, 1);

  pp().unsubscribe('some.*', callback);

  pp().publish('some.one');
  equal(callback.called, 1);
});

function checkTopicValidation(msg, expected) {
  var success = true;
  try {
    pingpong.publish(msg);
  } catch (e) {
    success = false;
  }
  equal(success, expected);
}

test('valid topic', function () {
  checkTopicValidation('some', true);
  checkTopicValidation('someSome', true);
  checkTopicValidation('123some', true);
  checkTopicValidation('some_1234', true);
  checkTopicValidation('abc.*', true);
});

test('invalid topic', function () {
  checkTopicValidation('', false);
  checkTopicValidation('.', false);
  checkTopicValidation('some-some', false);
  checkTopicValidation(' ', false); 
  checkTopicValidation('some..', false);
  checkTopicValidation('***', false);
});

test('create channel with topic', function () {
  var p = pingpong.channel('some');
  var callback = mockFunction();
  
  p.subscribe('one', callback); // subscribe some.one

  pp().publish('some.one');
  p.publish('one');

  equal(callback.called, 2);
});

test('create deeper channel', function () {
  var p = pingpong.channel('ping');
  var q = p.channel('pong');
  var callback = mockFunction();
  
  q.subscribe('one', callback);

  pp().publish('ping.pong.one');

  equal(callback.called, 1);
});

test('create two channel with same name', function () {
  var p = pingpong.channel('some');
  var p2 = pingpong.channel('some');
  
  equal(p, p2);
});