/* eslint-env node */
const MultiReporter = require('testem-multi-reporter');
const TimeReporter = require('testem-time-reporter');
const XunitReporter = require('testem/lib/reporters/xunit_reporter');
const fs = require('fs');
const chromium = require('ember-chromium');
const util = require('util');
const XUNIT_DEST = process.env.XUNIT_DEST || 'tests/xunit.xml';
const writeStream = fs.createWriteStream(XUNIT_DEST);

const reporters = [{
  ReporterClass: TimeReporter,
  args: [{ out: process.stdout }]
}, {
  ReporterClass: XunitReporter,
  args: [false, writeStream, { get: () => false }]
}];
const multiReporter = new MultiReporter({ reporters });

const chromiumArgs = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-gesture-requirement-for-media-playback',
  '--allow-file-access',
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--remote-debugging-port=0',
  '--remote-debugging-address=0.0.0.0',
  '--screen-size=1200x800',
  '--unsafely-treat-insecure-origin-as-secure',
  '--unsafely-allow-protected-media-identifier-for-domain',
  '--disable-web-security',
  '--test-type=browser',
  util.format('--user-data-dir=/tmp/chrome%s', Math.floor(Math.random() * 100))
];

const testemConfig = chromium.getTestemConfig(chromiumArgs);
testemConfig.parallel = -1;
testemConfig.reporter = multiReporter;

module.exports = testemConfig;
