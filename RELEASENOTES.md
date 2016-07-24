# cordova-simulate Release Notes

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
