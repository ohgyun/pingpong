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
