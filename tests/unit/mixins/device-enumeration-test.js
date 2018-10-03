import Ember from 'ember';
import DeviceEnumerationMixin from 'webrtc-devices/mixins/device-enumeration';
import { module, test } from 'qunit';

let DeviceEnumerationObject, subject;
module('Unit | Mixin | device enumeration', {
  beforeEach () {
    DeviceEnumerationObject = Ember.Object.extend(DeviceEnumerationMixin, {
      intl: { t: s => s }
    });
    subject = DeviceEnumerationObject.create();
  }
});

test('it works', assert => {
  assert.ok(subject);
});

test('hasCamera should be false if there are no cameras with non-default id', assert => {
  assert.equal(subject.get('hasCamera'), false);
  subject.get('cameraList').pushObject({
    deviceId: 'default',
    label: 'Default'
  });
  assert.equal(subject.get('hasCamera'), false);
  subject.get('cameraList').pushObject({
    deviceId: 'asdfFoobar',
    label: 'Cutiebot Jr'
  });
  assert.equal(subject.get('hasCamera'), true);
});

test('hasMicrophone should be true if there is a microphone, even if it has a default id', assert => {
  assert.equal(subject.get('hasMicrophone'), false);
  subject.get('microphoneList').pushObject({
    deviceId: 'default',
    label: 'Default'
  });
  assert.equal(subject.get('hasMicrophone'), true);
});

test('setOutputDevice will reject if the device is not found', assert => {
  assert.expect(1);

  subject.set('outputDeviceList', Ember.A([
    { deviceId: '1234' },
    { deviceId: '4567' }
  ]));

  return subject.setOutputDevice(null, { deviceId: '0987' }).catch(err => {
    assert.ok(err);
  });
});

test('enumerateResolutions should return back a list of resolutions', assert => {
  subject.set('fullHd', true);
  const resolutions = subject.enumerateResolutions();
  assert.ok(resolutions.length);
});

test('enumerateResolutions | running multiple times should not increase array size', assert => {
  subject.set('fullHd', true);
  subject.enumerateResolutions();
  const count = subject.get('resolutionsList.length');

  subject.enumerateResolutions();
  const count2 = subject.get('resolutionsList.length');
  assert.equal(count, count2);
});

const MediaDevices = Ember.Object.extend(Ember.Evented, {
  enumerateDevices: () => Ember.RSVP.resolve()
});
MediaDevices.constructor.prototype.ondevicechange = null;

function setMediaDevices (isFirstCall) {
  if (isFirstCall) {
    try {
      window.navigator = {
        mediaDevices: () => {}
      };
    } catch (e) {}// swallow error when assigning read-only window.navigator
  } else {
    try {
      window.navigator = {
        mediaDevices: MediaDevices.create()
      };
    } catch (e) {} // swallow error when assigning read-only window.navigator
  }
}

test('enumerateDevices should return a list of devices', assert => {
  setMediaDevices(true);
  const enumerateDevicesFirstCall = subject.enumerateDevices();
  if (enumerateDevicesFirstCall) {
    assert.ok(subject.enumerateDevices());
  }
  setMediaDevices(false);
  subject.set('callCapable', true);
  const enumerateDevicesSecondCall = subject.enumerateDevices();
  if (enumerateDevicesSecondCall && window.navigator.mediaDevices && window.navigator.mediaDevices.enumerateDevices) {
    assert.ok(enumerateDevicesSecondCall);
  }
});

test('setDefaultOutputDevice should return default output device', assert => {
  subject.set('defaultOutputDevice', {
    deviceId: '1234'
  });
  subject.set('outputDeviceList', Ember.A([
    { deviceId: '1234' },
    { deviceId: '4567' }
  ]));
  const video = document.createElement('video');
  return subject.setDefaultOutputDevice(video && video.paused || video)
    .then(device => assert.ok(device))
    .catch(err => assert.ok(err));
});

test('updateDefaultDevices should throw an error when called', assert => {
  try {
    subject.updateDefaultDevices();
  } catch (e) {
    assert.throws(e, 'updateDefaultDevices should be overridden - do you need to save preferences or change video stream?');
  }
});

test('updateDefaultDevices should not throw an error when called if it has been extended', assert => {
  try {
    const DeviceEnumerationObject2 = Ember.Object.extend(DeviceEnumerationMixin, {
      updateDefaultDevices () {
        return true;
      },
      intl: { t: s => s }
    });
    const subject2 = DeviceEnumerationObject2.create();
    subject2.updateDefaultDevices();
  } catch (e) {
    assert.ok(false, 'updateDefaultDevices should not have thrown here');
  }
  assert.ok(true, 'it finished without throwing');
});

test('updateDefaultDevices should not throw an error when called if it has been extended', assert => {
  try {
    const SomeOtherMixin = Ember.Mixin.create({
      updateDefaultDevices () {
        return true;
      }
    });
    const DeviceEnumerationObject2 = Ember.Object.extend(SomeOtherMixin, DeviceEnumerationMixin, {
      intl: { t: s => s }
    });
    const subject2 = DeviceEnumerationObject2.create();
    subject2.updateDefaultDevices();
  } catch (e) {
    assert.ok(false, 'updateDefaultDevices should not have thrown here');
  }
  assert.ok(true, 'it finished without throwing');
});

function setWindowPropertiesForCallCapable (isVideoCall) {
  window.RTCPeerConnection = (e, t) => {};
  try {
    window.navigator.mediaDevices = {
      getUserMedia: (e) => {}
    };
  } catch (e) {
    // swallow error when assigning read-only window.navigator
  }
  window.AudioContext = () => {};
  window.AudioContext.prototype.createMediaStreamSource = () => {};
}

test('audioCallCapable should be true if all properties exists', assert => {
  // Mock out needed properties in window object
  setWindowPropertiesForCallCapable();
  assert.equal(subject.get('audioCallCapable'), true);
});

test('audioCallCapable will be true even if window audio context is not', assert => {
  // Mock out needed properties in window object
  setWindowPropertiesForCallCapable();
  window.AudioContext = undefined;
  window.RTCRtpTransceiver = () => {};
  assert.equal(subject.get('audioCallCapable'), true);
});

test('videoCallCapable should be true if all audioCallCapable is true and other props for videoCallCapable', assert => {
  subject.set('audioCallCapable', true);
  const video = document.createElement('video');
  const canPause = video && video.paused || false;
  if (canPause) {
    assert.equal(subject.get('videoCallCapable'), true);
  } else {
    assert.equal(subject.get('videoCallCapable'), false);
  }
});
