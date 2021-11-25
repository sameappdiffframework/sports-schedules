const { StacktraceOption } = require('jasmine-spec-reporter');
const { SpecReporter } = require('jasmine-spec-reporter');

class MyReporter extends SpecReporter {
  constructor() {
    super({ summary: { displayStacktrace: StacktraceOption.RAW } });
  }
}

module.exports = MyReporter;
