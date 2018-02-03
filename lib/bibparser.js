const stream = require('stream');
const miss = require('mississippi');
const byline = require('byline');

class ObjBuilder {
  constructor() {
    this.object = {};
  }

  add(code, data) {
    if (!this.object[code]) {
      this.object[code] = [data];
      this.object[code].first = data;
    } else {
      this.object[code].push(data);
    }
    this.object[code].last = data;
  }

  extend(code, data) {
    let e = this.object[code];
    if (!e) {
      throw new Error('no line with code ' + code);
    }
    let nv = e.last + ' ' + data;
    e.last = nv;
    e[e.length - 1] = nv;
    if (e.length == 1) {
      e.first = nv;
    }
  }

  build() {
    return this.object;
  }
}

class BibParser extends stream.Transform {
  constructor() {
    super({objectMode: true});
    this.builder = new ObjBuilder;
    this.code = null;
  }

  _transform(line, enc, cb) {
    line = line.toString('utf8');
    if (line.match(/^\s*$/)) {
      if (this.code) {
        this.push(this.builder.build());
      }
      this.builder = new ObjBuilder;
      this.code = null;
    } else {
      var m = line.match(/^%([A-Z0-9$*^])\s*(.*)/);
      if (m) {
        let [line, code, value] = m;
        this.code = code;
        this.builder.add(code, value);
      } else {
        this.builder.extend(this.code, line);
      }
    }
    cb();
  }

  _flush(cb) {
    if (this.code) {
      this.push(this.object);
    }
    process.nextTick(cb);
  }
}

module.exports.parse = function newBibParsingStream() {
  var lines = byline.createStream(null, {keepEmptyLines: true});
  var parse = new BibParser();
  lines.pipe(parse);
  return miss.duplex.obj(lines, parse);
};