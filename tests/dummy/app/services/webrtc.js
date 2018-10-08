import Ember from 'ember';
import DeviceEnumerationMixin from 'webrtc-devices/mixins/device-enumeration';

export default Ember.Service.extend(DeviceEnumerationMixin, {
  intl: Ember.inject.service(),
  session: Ember.inject.service(),
  settings: Ember.inject.service(),
  canListDevices: true,
  cameraList: Ember.A(),
  microphoneList: Ember.A(),
  outputDeviceList: Ember.A(),
  resolutionList: Ember.A(),

  lookup (key, hash) {
    const intl = this.get('intl');
    return intl.formatHtmlMessage(intl.findTranslationByKey(key), hash);
  },

  init () {
    this._super(...arguments);
    window.webrtcService = this;
  }
});
