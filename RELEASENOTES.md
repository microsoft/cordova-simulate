# cordova-simulate Release Notes

### 0.3.2 (Sep 29, 2016)
* Add localization support (current machine localized for 13 languages - real translations coming soon)
  ([#153](https://github.com/Microsoft/cordova-simulate/pull/153), [#155](https://github.com/Microsoft/cordova-simulate/pull/155),
  [#156](https://github.com/Microsoft/cordova-simulate/pull/156), [#158](https://github.com/Microsoft/cordova-simulate/pull/158),
  [#159](https://github.com/Microsoft/cordova-simulate/pull/159)) 
* Updated Device panel and devices list ([#150](https://github.com/Microsoft/cordova-simulate/pull/150))

### 0.3.1 (Sep 17, 2016)
* Fix [#152](https://github.com/Microsoft/cordova-simulate/issues/152): Published package fails when run on command line (windows newline)
* Fix live-reload when launching from VS ([#151](https://github.com/Microsoft/cordova-simulate/pull/151))
* If prepare fails, display a warning and continue ([#149](https://github.com/Microsoft/cordova-simulate/pull/149))
* Adds ability to customize sim-host window title ([#147](https://github.com/Microsoft/cordova-simulate/pull/147))

### 0.3.0 (Aug 24, 2016)
* Fix [#117](https://github.com/Microsoft/cordova-simulate/issues/117): cordova-number-entry fields indicate valid values are invalid ([#140](https://github.com/Microsoft/cordova-simulate/pull/140))
* Fix battery status label in IE ([#138](https://github.com/Microsoft/cordova-simulate/pull/138))
* Improve column rendering in IE ([c019b9a1](https://github.com/Microsoft/cordova-simulate/commit/c019b9a1))
* Fix [#136](https://github.com/Microsoft/cordova-simulate/issues/136): Styling broken in IE ([#137](https://github.com/Microsoft/cordova-simulate/pull/137))
* Ensure IE compatibility mode is off ([2c20e648](https://github.com/Microsoft/cordova-simulate/commit/2c20e648))
* Restore CLI support ([#134](https://github.com/Microsoft/cordova-simulate/pull/134))
* Fix [#130](https://github.com/Microsoft/cordova-simulate/issues/130): Specifying a `connect-src` in the CSP breaks debugging ([#131](https://github.com/Microsoft/cordova-simulate/pull/131))
* Support simulation when there's no plugins added to the project ([#133](https://github.com/Microsoft/cordova-simulate/pull/133))
* Adjust browserify settings to not create global `require` ([#132](https://github.com/Microsoft/cordova-simulate/pull/132))
* Fix [#128](https://github.com/Microsoft/cordova-simulate/issues/128): App is not simulated when `<head>` contains any `data-*` attribute ([#129](https://github.com/Microsoft/cordova-simulate/pull/129))
* Fix race condition subscribing to socket events ([#127](https://github.com/Microsoft/cordova-simulate/pull/127))
* Fix [#114](https://github.com/Microsoft/cordova-simulate/issues/114): Camera: file picker doesn't validate that the result is a valid content ([#116](https://github.com/Microsoft/cordova-simulate/pull/116))
* Server module object-oriented redesign (API break change) ([#84](https://github.com/Microsoft/cordova-simulate/pull/84))

### 0.2.3 (July 24, 2016)
* Use npm package for `send-transform` rather than github branch ([be26606e](https://github.com/Microsoft/cordova-simulate/commit/be26606e)).
* Position sim-host UI to the left rather than sort of centered ([5f082644](https://github.com/Microsoft/cordova-simulate/commit/5f082644)).

### 0.2.2 (July 21, 2016)
* Fix [#103](https://github.com/Microsoft/cordova-simulate/issues/103) Geolocation: Changing long / lat values using arrows does not update the map ([ce4b7649](https://github.com/Microsoft/cordova-simulate/commit/ce4b7649))
* Fix XHR proxy with non-standard ports ([9fd2ff36](https://github.com/Microsoft/cordova-simulate/commit/9fd2ff36))
* Validate input number to be always a number ([4ea94f6a](https://github.com/Microsoft/cordova-simulate/commit/4ea94f6a))
* Retry Cordova prepare if it fails the first time ([5456e44a](https://github.com/Microsoft/cordova-simulate/commit/5456e44a))

### 0.2.1 (June 30, 2016)
* Bootstrap protocol enhancements
* Multiple bug fixes and improvements

### 0.2.0 (June 9, 2016)
* Support for additional core plugins: cordova-plugin-battery-status, cordova-plugin-network-information, cordova-plugin-device-orientation, cordova-plugin-inappbrowser
* Live reload
* Touch events
* CORS proxy
* Device screen resizing
* Multiple bug fixes and improvements

### 0.1.3 (Oct 28, 2015)
* Adds support for some basic telemetry ([e547555f](https://github.com/Microsoft/taco-simulate-server/commit/e547555f)).
* Ensure server is closed if an error occurs ([ffe2b134](https://github.com/Microsoft/taco-simulate-server/commit/ffe2b134)).
* Expose `server` and `log` ([d0dc5224](https://github.com/Microsoft/taco-simulate-server/commit/d0dc5224)).

### 0.1.2 (Oct 13, 2015)
* Better handled scenarios with no success/fail methods ([0805ad28](https://github.com/Microsoft/taco-simulate-server/commit/0805ad28)).
* Handle plugins with "old style" id ([5b46fddb](https://github.com/Microsoft/taco-simulate-server/commit/5b46fddb)).

### 0.1.1 (Oct 8, 2015)
* Restore missing utils.navHelper() method ([63ef7679](https://github.com/Microsoft/taco-simulate-server/commit/63ef7679)).

### 0.1.0 (Oct 8, 2015)
* Initial test release
