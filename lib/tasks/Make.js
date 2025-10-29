

'use strict'

const Task = require('../Task'),
  helpers = require('../helpers'),
  chalk = require('chalk'),
  compiler = global.compiler || require('riot-compiler'),
  path = require('path'),
  sh = require('shelljs'),
  rollup = require('rollup'),
  constants = require('./../const'),
  START_FRAG = constants.MODULAR_START_FRAG,
  END_FRAG = constants.MODULAR_END_FRAG;

class Make extends Task {
  run(opt) {
    // Generate a list of input/output files
    const isInputFile = opt.flow[0] === 'f';
    const isOutputFile = opt.flow[1] === 'f';
    const from = isInputFile ? [opt.from] : helpers.find(this.extRegex, opt.from);
    const base = isInputFile ? path.dirname(opt.from) : opt.from;
    const to = isOutputFile ? [opt.to] : helpers.remap(this.extRegex, from, opt.to, base, opt.export);

    // Create any necessary dirs
    const dirs = {};
    to.forEach(f => dirs[path.dirname(f)] = 0);
    sh.mkdir('-p', Object.keys(dirs));

    // extend the compiler parsers
    if (opt.parsers) helpers.extend(compiler.parsers, opt.parsers);

    // Process files
    if (isOutputFile) this.toFile(from, to, opt);
    else this.toDir(from, to, opt);

    // Print what's been done (unless --silent)
    /* istanbul ignore next */
    if (!opt.compiler.silent) {
      from.forEach((src, i) => {
        helpers.log(
          chalk.blue(helpers.toRelative(src)) +
          chalk.cyan(' -> ') +
          chalk.green(helpers.toRelative(to[i] || to[0]))
        );
      });
    }
    return true;
  }

  toFile(from, to, opt) {
    const out = from.map(path => this.parse(path, opt)).join('\n');
    const enc = this.encapsulate(out, opt);
    if (opt.compiler.modular) {
      rollup.rollup({
        input: from[0],
        onwarn: helpers.log
      }).then(bundle => {
        return bundle.generate({ format: opt.compiler.modular });
      }).then(result => {
        sh.ShellString(result.output[0].code).to(to[0]);
      }).catch(helpers.err);
    } else {
      enc.to(to[0]);
    }
  }

  toDir(from, to, opt) {
    from.forEach((src, i) => {
      this.encapsulate(this.parse(src, opt), opt).to(to[i]);
    });
  }

  parse(from, opt) {
    let out;
    // Silence stdout and stderr during compile to suppress parser errors
    const originalStderrWrite = process.stderr.write;
    const originalStdoutWrite = process.stdout.write;
    process.stderr.write = function() { return true; };
    process.stdout.write = function() { return true; };
    try {
      out = compiler.compile(
        sh.cat(from).toString().replace(/^\uFEFF/g, ''),
        opt.compiler,
        from
      );
    } catch (e) {
      helpers.err(e);
    } finally {
      process.stderr.write = originalStderrWrite;
      process.stdout.write = originalStdoutWrite;
    }
    if (opt.export) {
      if (Array.isArray(out)) {
        try {
          return out.reduce((prev, curr) => prev + curr[opt.export], '');
        } catch (e) {
          // Suppress error output and skip writing file
          return '';
        }
      } else {
        return '';
      }
    } else {
      return out;
    }
  }

  encapsulate(from, opt) {
    const out = !opt.compiler.modular ? from : `${START_FRAG}${from}${END_FRAG}`;
    return sh.ShellString(out);
  }
}

module.exports = Make