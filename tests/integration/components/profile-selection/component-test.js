/* global QUnit */

import Ember from 'ember';
import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import wait from 'ember-test-helpers/wait';

const tHelper = Ember.Helper.extend({
  compute: (params) => params[0]
});

const andHelper = Ember.Helper.extend({
  compute: (params) => params[0] && params[1]
});

import startApp from '../../../helpers/start-app';

QUnit.testStart(function () {
  window.App = startApp();
});

const webrtcService = Ember.Service.extend({
  canListDevices: true,
  cameraList: Ember.A(),
  microphoneList: Ember.A(),
  outputDeviceList: Ember.A(),
  resolutionList: Ember.A(),
  setOutputDevice: function () { return Ember.RSVP.resolve(); },
  enumerateDevices () { },
  enumerateResolutions () { }
});

const intlService = Ember.Service.extend({
  t: function (key) {
    switch (key) {
      case 'webrtcDevices.useComputerSettings':
        return 'UseComputerSettings';
    }
  }
});

const renderDefault = function () {
  this.render(hbs`
        {{profile-selection
        }}
    `);
};

const sessionService = Ember.Service.extend({
  features: {
    'preferences.sound': false
  }
});

const settingsService = Ember.Service.extend({
  openSoundPreferences: function () {}
});

moduleForComponent('profile-selection', 'Integration | Component | profile selection', {
  integration: true,

  beforeEach: function () {
    this.register('helper:t', tHelper);
    this.register('helper:and', andHelper);
    this.register('service:webrtc', webrtcService);
    this.register('service:intl', intlService);
    this.register('service:session', sessionService);
    this.register('service:settings', settingsService);

    this.inject.service('webrtc', { as: 'webrtc' });
    this.inject.service('intl', { as: 'intl' });
    this.inject.service('session', { as: 'session' });
    this.inject.service('settings', { as: 'settings' });
    this.renderDefault = renderDefault.bind(this);
    this.get('webrtc.resolutionList').clear();
    this.get('webrtc.cameraList').clear();
    this.get('webrtc.microphoneList').clear();
    this.get('webrtc.outputDeviceList').clear();
    this.set('camera', null);
    this.set('microphone', null);
    this.set('resolution', null);
    this.set('outputDevice', null);
    this.set('video', true);
    this.set('audio', true);
    this.set('audioCallCapable', true);
    this.set('videoCallCapable', true);
  }
});

test('it renders should display only the dropdown-menu', function (assert) {
  // Set any properties with this.set('myProperty', 'value')
  // Handle any actions with this.on('myAction', function(val) { ... });"

  this.renderDefault();
  return wait()
    .then(() => {
      assert.equal(this.$('.dropdown-menu').length, 1);
      assert.equal(this.$('.device-selection').length, 0);
    });
});

test('it should start with default profile selected', function (assert) {
  // Set any properties with this.set('myProperty', 'value')
  // Handle any actions with this.on('myAction', function(val) { ... });"
  this.renderDefault();
  return wait()
    .then(() => {
      assert.equal((this.$('.btn-toggle div').text()).replace(/^\s+|\s+$/gm, ''), this.get('intl').t('webrtcDevices.useComputerSettings'));
    });
});
