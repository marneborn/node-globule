'use strict';

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var globule = require('../lib/globule.js');

// When comparing unsorted results, per-pattern filepaths are often collected
// (and emitted) out-of-order. So first group them by pattern, then sort, then
// build the result array. This is a more realistic comparison than just
// sorting the entire array.
function sortFilepathsByPattern(filepaths, lengths) {
  return lengths.reduce(function(result, length) {
    var sorted = filepaths.slice(result.length, result.length + length).sort();
    return result.concat(sorted);
  }, []);
}

exports['Globule'] = {
  setUp: function(done) {
    this.cwd = process.cwd();
    process.chdir('test/fixtures/expand');
    done();
  },
  tearDown: function(done) {
    process.chdir(this.cwd);
    done();
  },
  'constructor': function(test) {
    test.expect(3);
    var expected = ['bar.js', 'foo.js'];
    var g = new globule.Globule(['*.js'], {srcBase: 'js'}, function(err, actual) {
      test.deepEqual(actual, expected, 'callback result set should be the same.');
    });
    var filepaths = [];
    g.on('match', function(filepath) {
      filepaths.push(filepath);
    });
    g.on('end', function(actual) {
      test.deepEqual(actual, expected, 'end-emitted result set should be the same.');
      test.deepEqual(filepaths, expected, 'match-emitted filepaths should be the same.');
      test.done();
    });
  },
};

exports['event emitter'] = {
  setUp: function(done) {
    this.cwd = process.cwd();
    process.chdir('test/fixtures/expand');
    done();
  },
  tearDown: function(done) {
    process.chdir(this.cwd);
    done();
  },
  'event emitter': function(test) {
    test.expect(2);
    var g = new globule.Globule(['**/*.js', '!js/bar.js', '**/*.css', '!css/baz.css', 'js/foo.js']);
    var expected = ['js/foo.js', 'css/qux.css'];
    var filepaths = [];
    g.on('match', function(filepath) {
      filepaths.push(filepath);
    });
    g.on('end', function(actual) {
      test.deepEqual(actual, expected, 'end-emitted result set should be the same.');
      test.deepEqual(filepaths, expected, 'match-emitted filepaths should be the same.');
      test.done();
    });
  },
  'event emitter abort': function(test) {
    test.expect(3);
    var g = new globule.Globule(['**/*.js', '!js/bar.js', '**/*.css', '!css/baz.css']);
    var expected = ['js/foo.js'];
    var filepaths = [];
    var aborted = false;
    g.on('match', function(filepath) {
      filepaths.push(filepath);
      g.abort();
    });
    g.on('abort', function() {
      aborted = true;
    });
    g.on('end', function(actual) {
      test.ok(aborted, 'abort event should have been emitted.');
      test.deepEqual(actual, expected, 'end-emitted result set should not include matches from after the first inclusion pattern.');
      test.deepEqual(filepaths, expected, 'match-emitted filepaths should not include matches from after the first inclusion pattern.');
      test.done();
    });
  },
  'event emitter pause': function(test) {
    test.expect(2);
    var expected = ['js/foo.js'];
    var g = new globule.Globule(['**/*.js', '!js/bar.js', '**/*.css']);
    var filepaths = [];
    var ended = false;
    g.on('match', function(filepath) {
      filepaths.push(filepath);
      g.pause();
      setTimeout(function() {
        test.ok(!ended, 'end event should not be emitted while paused.');
        test.deepEqual(filepaths, expected, 'match-emitted filepaths should not include matches from after the first inclusion pattern.');
        test.done();
      }, 50);
    });
    g.on('end', function() {
      ended = true;
    });
  },
  'event emitter resume': function(test) {
    test.expect(2);
    var expected = [
      'README.md', 'deep/deep.txt', 'deep/deeper/deeper.txt', 'deep/deeper/deepest/deepest.txt',
      'css/baz.css', 'css/qux.css', 'js/bar.js', 'js/foo.js',
      'css/', 'deep/', 'deep/deeper/', 'deep/deeper/deepest/', 'js/',
    ];
    var g = new globule.Globule(['**/*.{txt,md}', '**/*.{js,css}', '**/']);
    var filepaths = [];
    g.on('match', function(filepath) {
      filepaths.push(filepath);
      g.pause();
      setTimeout(g.resume.bind(g), 50);
    });
    g.on('end', function(actual) {
      test.deepEqual(actual, expected, 'end-emitted result set should be the same.');
      test.deepEqual(filepaths, expected, 'match-emitted filepaths should be the same.');
      test.done();
    });
  },
  'event emitter (nosort)': function(test) {
    test.expect(2);
    var expected = [
      'README.md', 'deep/deep.txt', 'deep/deeper/deeper.txt', 'deep/deeper/deepest/deepest.txt',
      'css/baz.css', 'css/qux.css', 'js/bar.js', 'js/foo.js',
      'css/', 'deep/', 'deep/deeper/', 'deep/deeper/deepest/', 'js/',
    ];
    var g = new globule.Globule(['**/*.{txt,md}', '**/*.{js,css}', '**/'], {nosort: true});
    var filepaths = [];
    g.on('match', function(filepath) {
      filepaths.push(filepath);
      g.pause();
      setTimeout(g.resume.bind(g), 50);
    });
    g.on('end', function(actual) {
      test.deepEqual(
        sortFilepathsByPattern(actual, [4, 4, 5]),
        sortFilepathsByPattern(expected, [4, 4, 5]),
        'end-emitted result set should be the same (but out-of-order).');
      test.deepEqual(
        sortFilepathsByPattern(filepaths, [4, 4, 5]),
        sortFilepathsByPattern(expected, [4, 4, 5]),
        'match-emitted filepaths should be the same (but out-of-order).');
      test.done();
    });
  },
};
