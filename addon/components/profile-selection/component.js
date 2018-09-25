// import LoggerMixin from 'web-directory/mixins/logger'
import Ember from 'ember';
import layout from './template';
import { v1 } from 'ember-uuid';

const { computed, Component, inject } = Ember;

export default Component.extend(/* LoggerMixin, */{

  layout: layout,
  classNameBindings: [':profile-selection'],

  selectedProfile: {},
  previousSelectedProfile: {},
  showEditPart: false,
  savedProfiles: Ember.A(),

  audio: true,
  isReadOnly: false,
  video: true,
  troubleshoot: true,
  outputDevice: true,
  resolution: true,
  canEdit: false,

  defaultConfig: computed('webrtc.cameraList', 'webrtc.microphoneList', 'webrtc.outputDeviceList', 'webrtc.resolutionList', function () {
    return {
      selectedCameraId: this.get('webrtc.cameraList').findBy('deviceId', 'default'),
      selectedMicrophoneId: this.get('webrtc.microphoneList').findBy('deviceId', 'default'),
      selectedOutputDeviceId: this.get('webrtc.outputDeviceList').findBy('deviceId', 'default'),
      selectedResolutionId: this.get('webrtc.resolutionList').findBy('presetId', 3)
    };
  }),

  webrtc: inject.service(),
  intl: inject.service(),

  audioCallCapable: computed.reads('webrtc.audioCallCapable'),
  videoCallCapable: computed.reads('webrtc.videoCallCapable'),

  showTroubleshoot: computed('troubleshoot', function () {
    return this.get('troubleshoot') && typeof this.attrs.openTroubleshoot === 'function';
  }),

  profileFilteredList: computed('savedProfiles.[]', 'webrtc.cameraList', 'webrtc.microphoneList', 'webrtc.outputDeviceList', 'webrtc.resolutionList', function () {
    return this.get('savedProfiles').map((item) => {
      let canBeSelected = true;
      let matchingCamera = null;
      let matchingOutputDevice = null;
      let matchingMicrophone = null;
      if (item.selectedCamera) {
        matchingCamera = this.findMatchingDevice(this.get('webrtc.cameraList'), item.selectedCamera);
        if (!matchingCamera) {
          canBeSelected = false;
        }
      }
      if (item.selectedMicrophone) {
        matchingMicrophone = this.findMatchingDevice(this.get('webrtc.microphoneList'), item.selectedMicrophone);
        if (!matchingMicrophone) {
          canBeSelected = false;
        }
      }
      if (item.selectedOutputDevice) {
        matchingOutputDevice = this.findMatchingDevice(this.get('webrtc.outputDeviceList'), item.selectedOutputDevice);
        if (!matchingOutputDevice) {
          canBeSelected = false;
        }
      }
      canBeSelected &= item.selectedResolution ? !!this.get('webrtc.resolutionList').findBy('presetId', item.selectedResolution.presetId) : true;
      return Object.assign({}, item, {
        isDisabled: !canBeSelected,
        selectedCamera: matchingCamera,
        selectedMicrophone: matchingMicrophone,
        selectedOutputDevice: matchingOutputDevice
      });
    });
  }),

  findMatchingDevice: function (deviceList, device) {
    if (!device || !deviceList || !deviceList.length) {
      return false;
    }
    let find = deviceList.findBy('deviceId', device.deviceId);
    if (find) {
      return find;
    }
    const formattedName = device.label ? device.label.replace(/(.*)\s?\(.*/, '$1') : '';
    find = deviceList.find((d) => {
      return d.label && d.label.toLowerCase().indexOf(formattedName.toLowerCase()) === 0;
    });
    return find;
  },

  init () {
    this._super(...arguments);

    this.get('webrtc').enumerateDevices();
    this.get('webrtc').enumerateResolutions();
    this.set('profileNameLabel', this.get('intl').t('webrtcDevices.profileNameLabel'));
    this.set('selectedProfileName', this.get('intl').t('webrtcDevices.useComputerSettings'));
    this.addObserver('profileFilteredList', this, 'profileFilteredListChanged');
    this.addObserver('showEditPart', this, 'onShowEditPartChanged');
    this.addObserver('selectedProfileId', this, 'onSelectedProfileIdChanged');
    this.addObserver('selectedProfile', this, 'onSelectedProfileChange');
    Ember.run.schedule('afterRender', this, function () {
      this.onSelectedProfileIdChanged();
      this.checkBrowserPermissions();
    });
  },

  /* this is needed to select correct values in select box */
  onSelectedProfileChange () {
    this.setProperties({
      canEdit: !!this.get('selectedProfile.id'),
      selectedProfileName: this.getWithDefault('selectedProfile.name', this.get('intl').t('webrtcDevices.useComputerSettings')),
      selectedCameraId: this.get('selectedProfile.selectedCamera.deviceId'),
      selectedMicrophoneId: this.get('selectedProfile.selectedMicrophone.deviceId'),
      selectedOutputDeviceId: this.get('selectedProfile.selectedOutputDevice.deviceId'),
      selectedResolutionId: this.get('selectedProfile.selectedResolution.presetId')
    });
  },

  /*
  */
  onSelectedProfileIdChanged () {
    if (!this.get('selectedProfileId')) {
      return;
    }
    const find = this.get('profileFilteredList').find((item) => item.id === this.get('selectedProfileId'));
    if (find) {
      this.set('selectedProfile', Object.assign({}, find.isDisabled ? this.get('defaultConfig') : find));
      this.send('setProfileAsActive');
    }
  },

  /*
  * when list is changing if the profile selected is no more available we switch to default
  */
  profileFilteredListChanged () {
    if (!this.get('selectedProfile.id')) {
      return;
    }
    const find = this.get('profileFilteredList').find((item) => item.id === this.get('selectedProfile.id'));
    if (!find || find.isDisabled) {
      this.set('selectedProfile', Object.assign({}, this.get('defaultConfig')));
      this.send('setProfileAsActive');
    }
  },

  onShowEditPartChanged () {
    setTimeout(() => {
      if (this.get('showEditPart')) {
        this.$('input:first').focus();
      } else {
        this.$('button:first').focus();
      }
    });
  },

  checkBrowserPermissions () {
    window.navigator.mediaDevices.getUserMedia({
      audio: this.get('audio'),
      video: this.get('video')
    }).then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      this.get('webrtc').enumerateDevices();
    }).catch(() => {
      this.set('isReadOnly', true);
    });
  },

  saveProfile (profile) {
    let _profile = this.get('savedProfiles').findBy('name', profile.name);
    if (_profile && _profile.id !== profile.id) {
      // TODO display warn
    }
    if (!_profile && !this.get('savedProfiles').findBy('id', profile.id)) {
      this.get('savedProfiles').pushObject(this.get('selectedProfile'));
    } else {
      _profile = this.get('savedProfiles').findBy('id', profile.id);
      let index = this.get('savedProfiles').indexOf(_profile);
      this.get('savedProfiles.[]').replace(index, 1, Object.assign({}, this.get('selectedProfile')));
    }
    if (typeof this.attrs.saveProfiles === 'function') {
      this.attrs.saveProfiles(this.get('savedProfiles.[]'));
    }
  },

  showOutputDevicePicker: computed.and('outputDevice', 'audio'),
  showResolutionPicker: computed.and('webrtc.resolutionList.length', 'webrtc.cameraList.length', 'video', 'resolution'),

  actions: {
    /* Sending event to parent when profile is changing */
    setProfileAsActive () {
      this.set('previousSelectedProfile', Object.assign({}, this.get('selectedProfile')));
      if (typeof this.attrs.selectedProfileChanged === 'function') {
        this.attrs.selectedProfileChanged({
          id: this.get('selectedProfile.id'),
          selectedCamera: this.get('selectedProfile.selectedCamera'),
          selectedResolution: this.get('selectedProfile.selectedResolution'),
          selectedMicrophone: this.get('selectedProfile.selectedMicrophone'),
          selectedOutputDevice: this.get('selectedProfile.selectedOutputDevice'),
          name: this.get('selectedProfile.name')
        });
      }
    },

    openTroubleshoot () {
      if (typeof this.attrs.openTroubleshoot === 'function') {
        this.attrs.openTroubleshoot();
      }
    },

    showEditProfile () {
      this.set('showEditPart', true);
    },

    cancelProfileEdition () {
      this.set('showEditPart', false);
      this.set('selectedProfile', Object.assign({}, this.get('previousSelectedProfile')));
      this.set('selectedProfileName', this.getWithDefault('selectedProfile.name', this.get('intl').t('webrtcDevices.useComputerSettings')));
    },

    saveProfileEdition () {
      if (!this.get('selectedProfile.name')) {
        // TODO diplay error
        return;
      }

      this.set('showEditPart', false);
      this.set('selectedProfileName', this.get('selectedProfile.name'));
      this.saveProfile(this.get('selectedProfile'));
      this.send('setProfileAsActive');
    },

    useComputerSettings () {
      this.set('selectedProfile', Object.assign({}, this.get('defaultConfig')));
      this.send('setProfileAsActive');
      setTimeout(() => {
        this.$('button:first').focus();
      });
    },

    createNewProfile () {
      this.set('showEditPart', true);
      this.set('selectedProfile', Object.assign({id: v1()}, this.get('defaultConfig')));
    },

    deleteProfile (profileId) {
      var profileObj = this.get('savedProfiles').findBy('id', profileId);
      this.get('savedProfiles').removeObject(profileObj);
      if (typeof this.attrs.saveProfiles === 'function') {
        this.attrs.saveProfiles(this.get('savedProfiles.[]'));
      }
    },

    changeProfile (profile) {
      if (!profile.isDisabled) {
        this.set('selectedProfile', Object.assign({}, this.get('savedProfiles').findBy('id', profile.id)));
        this.send('setProfileAsActive');
      }
      setTimeout(() => {
        this.$('button:first').focus();
      });
    },

    changeCamera (id) {
      if (this.get('selectedCamera.deviceId') !== id) {
        this.set('selectedProfile.selectedCamera', this.get('webrtc.cameraList').findBy('deviceId', id));
      }
    },

    changeMicrophone (id) {
      if (this.get('selectedMicrophone.deviceId') !== id) {
        this.set('selectedProfile.selectedMicrophone', this.get('webrtc.microphoneList').findBy('deviceId', id));
      }
    },

    changeOutputDevice (id) {
      if (this.get('selectedOutputDevice.deviceId') !== id) {
        this.set('selectedProfile.selectedOutputDevice', this.get('webrtc.outputDeviceList').findBy('deviceId', id));
      }
    },

    changeResolution (id) {
      if (this.get('selectedResolution.presetId') !== id) {
        this.set('selectedProfile.selectedResolution', this.get('webrtc.resolutionList').findBy('presetId', id));
      }
    }
  }
});
