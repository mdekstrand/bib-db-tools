class BibParser extends stream.Transform {
    constructor() {
        super({objectMode: true});
        this.object = {};
        this.code = null;
    }

    _transform(line, enc, cb) {
        line = line.toString('utf8');
        if (line.match(/^\s*$/)) {
            if (this.code) {
                logger.debug('pushing %s', this.object.M);
                this.push(this.object);
            }
            this.object = {};
            this.code = null;
        } else {
            var m = line.match(/^%([A-Z$*^])\s*(.*)/);
            if (m) {
                this.code = m[1];
                this.object[this.code] = m[2];
            } else {
                this.object[this.code] += ' ' + line;
            }
        }
        cb();
    }

    _flush(cb) {
        if (this.code) {
            logger.debug('pushing %s', this.object.M);
            this.push(this.object);
        }
        process.nextTick(cb);
    }
}