/* global _, $ */

import Ember from 'ember';

const { Mixin, RSVP, computed, run } = Ember;

const UA = window.navigator.userAgent.toLowerCase();
const IS_CHROME = !!window && !!window.chrome && !!window.chrome.webstore;
const IS_FIREFOX = window && typeof InstallTrigger !== 'undefined';
let BROWSER_VERSION;
if (IS_CHROME) {
  BROWSER_VERSION = UA.match(/chrom(e|ium)/) && parseInt(UA.match(/chrom(e|ium)\/([0-9]+)\./)[2], 10);
} else if (IS_FIREFOX) {
  BROWSER_VERSION = parseInt(UA.match(/firefox\/([0-9]+)\./)[1], 10);
}

export default Mixin.create(Ember.Evented, {
  // options
  fullHd: false,

  canListDevices: false,

  // camera and video stuff
  hasCameraPermission: false,
  cameraList: Ember.A(),
  hasCamera: computed('cameraList.[]', function () {
    return !!_.find(this.get('cameraList'), (camera) => camera.deviceId !== 'default');
  }),

  // mic and audio stuff
  hasMicPermission: false,
  microphoneList: Ember.A(),
  hasMicrophone: computed.notEmpty('microphoneList'),

  callCapable: computed.and('audioCallCapable', 'videoCallCapable'),

  audioCallCapable: computed(function () {
    const PC = window.RTCPeerConnection;
    const gUM = window.navigator && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia;
    const supportWebAudio = window.AudioContext && window.AudioContext.prototype.createMediaStreamSource;
    const support = !!(PC && gUM && (supportWebAudio || window.RTCRtpTransceiver));

    return support;
  }),

  videoCallCapable: computed('audioCallCapable', function () {
    const audioCallCapable = this.get('audioCallCapable');
    if (!audioCallCapable) {
      return false;
    }

    const videoEl = document.createElement('video');
    const supportVp8 = videoEl && videoEl.canPlayType && videoEl.canPlayType('video/webm; codecs="vp8", vorbis') === 'probably';
    if (!supportVp8) {
      return false;
    }
    return true;
  }),

  outputDeviceList: Ember.A(),
  resolutionList: Ember.A(),

  canShareScreen: computed.reads('callCapable'),

  enumerationTimer: null,

  init () {
    this._super(...arguments);
    const timer = run.next(this, function () {
      this.enumerateDevices();
      this.enumerateResolutions();
    });
    this.set('enumerationTimer', timer);

    if (window.navigator && window.navigator.mediaDevices &&
        window.navigator.mediaDevices.constructor.prototype.hasOwnProperty('ondevicechange')) {
      $(window.navigator.mediaDevices).on('devicechange', () => {
        Ember.Logger.debug('onDeviceChange fired');
        Ember.run.debounce(this, this.enumerateDevices, true, 400);
      });
    }
  },

  willDestroy () {
    const timer = this.get('enumerationTimer');
    if (timer) {
      run.cancel(timer);
    }

    this._super(...arguments);
  },

  updateDefaultDevices (/* devices */) {
    const extended = !!this._super(...arguments);
    if (!extended) {
      throw new Error('updateDefaultDevices should be overridden - do you need to save preferences or change video stream?');
    }
  },

  enumerateResolutions () {
    const resolutions = Ember.A();
    resolutions.pushObject(Ember.Object.create({
      label: this.get('intl').t('webrtcDevices.resolutions.low').toString(),
      presetId: 1,
      constraints: {
        video: {
          width: { max: 320 },
          height: { max: 240 }
        }
      }
    }));

    resolutions.pushObject(Ember.Object.create({
      label: this.get('intl').t('webrtcDevices.resolutions.medium').toString(),
      presetId: 2,
      constraints: {
        video: {
          width: { max: 640 },
          height: { max: 480 }
        }
      }
    }));

    const hd = Ember.Object.create({
      label: this.get('intl').t('webrtcDevices.resolutions.high').toString(),
      presetId: 3,
      constraints: {
        video: {
          width: {
            min: 640,
            ideal: 1280,
            max: 1920
          },
          height: {
            min: 480,
            ideal: 720,
            max: 1080
          }
        }
      }
    });
    resolutions.pushObject(hd);

    // full hd is disabled by default because very few computers actually support this
    if (this.get('fullHd')) {
      resolutions.pushObject(Ember.Object.create({
        label: this.get('intl').t('webrtcDevices.resolutions.fullHd').toString(),
        presetId: 4,
        constraints: {
          video: {
            width: { exact: 1920 },
            height: { exact: 1080 }
          }
        }
      }));
    }

    this.set('resolutionList', resolutions);
    return resolutions;
  },

  // Returns a promise which resolves when all devices have been enumerated and loaded
  enumerateDevices (triggerListUpdatedEvent) {
    if (!window.navigator.mediaDevices || !window.navigator.mediaDevices.enumerateDevices) {
      return Ember.RSVP.reject();
    }
    let cameraCount = 0;
    let microphoneCount = 0;
    let outputDeviceCount = 0;
    const cameras = [];
    const microphones = [];
    const outputDevices = [];
    const defaultDevice = {
      deviceId: 'default',
      label: this.get('intl').t('webrtcDevices.default').toString()
    };

    const addCamera = (device, hasBrowserLabel) => {
      if (!hasBrowserLabel) {
        if (device.deviceId && device.deviceId.toLowerCase() === 'default') {
          device.label = this.get('intl').t('webrtcDevices.default').toString();
        } else if (device.deviceId && device.deviceId.toLowerCase().indexOf('communication') === 0) {
          device.label = this.get('intl').t('webrtcDevices.windowsCommunication').toString();
        }
        device.label = device.label || this.get('intl').t('webrtcDevices.cameraLabel', {number: ++cameraCount}).toString();
      }
      this.set('hasCameraPermission', this.get('hasCameraPermission') || hasBrowserLabel);
      cameras.push(Ember.Object.create(device));
    };
    const addMicrophone = (device, hasBrowserLabel) => {
      if (!hasBrowserLabel) {
        if (device.deviceId && device.deviceId.toLowerCase() === 'default') {
          device.label = this.get('intl').t('webrtcDevices.default').toString();
        } else if (device.deviceId && device.deviceId.toLowerCase().indexOf('communication') === 0) {
          device.label = this.get('intl').t('webrtcDevices.windowsCommunication').toString();
        }
        device.label = device.label || this.get('intl').t('webrtcDevices.microphoneLabel', {number: ++microphoneCount}).toString();
      }
      this.set('hasMicPermission', this.get('hasMicPermission') || hasBrowserLabel);
      microphones.push(Ember.Object.create(device));
    };
    const addOutputDevice = (device, hasLabel) => {
      if (!window.HTMLMediaElement.prototype.hasOwnProperty('setSinkId')) {
        return;
      }
      if (!hasLabel) {
        device.label = this.get('intl').t('webrtcDevices.outputDeviceLabel', {number: ++outputDeviceCount}).toString();
      }
      outputDevices.push(Ember.Object.create(device));
    };

    // always add a dummy default for video, since the browser doesn't give us one like microphone
    if (this.get('callCapable')) {
      addCamera(defaultDevice, false);
    }
    return window.navigator.mediaDevices.enumerateDevices().then((devices) => {
      Ember.Logger.log({
        message: 'webrtcDevices enumerated',
        devices
      });
      if (IS_FIREFOX && BROWSER_VERSION < 42) {
        this.set('canListDevices', false);
        addMicrophone(defaultDevice);
      } else {
        this.set('canListDevices', true);
        this.setProperties({
          hasCameraPermission: false,
          hasMicPermission: false
        });

        devices.forEach((device) => {
          const deviceInfo = {
            deviceId: device.deviceId,
            label: device.label,
            groupId: (device.deviceId && device.deviceId.toLowerCase() === 'default') ? null : device.groupId
          };
          const hasLabel = !_.isEmpty(device.label);

          if (device.kind === 'audioinput') {
            addMicrophone(deviceInfo, hasLabel);
          } else if (device.kind === 'audiooutput') {
            addOutputDevice(deviceInfo, hasLabel);
          } else if (device.kind === 'videoinput') {
            addCamera(deviceInfo, hasLabel);
          }
        });
      }

      this.setProperties({
        cameraList: Ember.A(cameras),
        microphoneList: Ember.A(microphones),
        outputDeviceList: Ember.A(outputDevices)
      });
      if (triggerListUpdatedEvent) {
        this.trigger('deviceListsUpdated');
      }
    }).catch(err => {
      if (!this.get('isDestroyed') && !this.get('isDestroying')) {
        Ember.Logger.error(err);
        this.set('canListDevices', false);
        addMicrophone(defaultDevice);
      }
    });
  },

  setOutputDevice (el, device) {
    if (typeof device !== 'object' || typeof device.deviceId === 'undefined' || device.deviceId === null) {
      return RSVP.Promise.reject('Cannot set null device');
    }

    const outputDevices = this.get('outputDeviceList');
    const outputDevice = outputDevices.findBy('deviceId', device.deviceId);
    if (!outputDevice) {
      return RSVP.Promise.reject(new Error('Cannot set output device: device not found'));
    }

    if (typeof el.setSinkId !== 'undefined') {
      return new RSVP.Promise(function (resolve) {
        if (el.paused) {
          el.onplay = () => resolve();
        } else {
          resolve();
        }
      }).then(function () {
        el.setSinkId(device.deviceId);
      }).then(() => {
        Ember.Logger.log({
          message: 'webrtcDevices outputDevice set',
          device: {
            deviceId: device.deviceId,
            label: device.label
          },
          outputDevices: outputDevices.map(d => ({ deviceId: d.deviceId, label: device.label }))
        });
      }).catch((err) => {
        Ember.Logger.error('failed to set audio output device', err);
      });
    } else {
      Ember.Logger.error('attempted to set sink id in unsupported browser');
      return RSVP.Promise.reject('Not supported');
    }
  },

  setDefaultOutputDevice (el) {
    const device = this.get('defaultOutputDevice');
    if (device) {
      return this.setOutputDevice(el, this.get('defaultOutputDevice'));
    }
    return RSVP.Promise.resolve();
  }
});
