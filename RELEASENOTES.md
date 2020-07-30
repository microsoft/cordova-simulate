# cordova-simulate Release Notes

## 0.8.2 (May 12, 2020)
* Fixed security vulnerabilities [#321](https://github.com/microsoft/cordova-simulate/pull/321), [#322](https://github.com/microsoft/cordova-simulate/pull/322), [#323](https://github.com/microsoft/cordova-simulate/pull/323)
* Fixed some live reload errors, thanks to [@CravateRouge](https://github.com/CravateRouge) [#320](https://github.com/microsoft/cordova-simulate/pull/320)

## 0.8.1 (May 12, 2020)
* Fixed security vulnerabilities [#318](https://github.com/microsoft/cordova-simulate/pull/318)
* Internal changes:
    * Added YAML based build definitions [#314](https://github.com/microsoft/cordova-simulate/pull/314), [#317](https://github.com/microsoft/cordova-simulate/pull/317)

## 0.8.0 (March 16, 2020)
* Fixed security vulnerabilities [#311](https://github.com/microsoft/cordova-simulate/pull/311), [#312](https://github.com/microsoft/cordova-simulate/pull/312)
* Added ability to use custom middleware to widen the range of supported plugins [#308](https://github.com/microsoft/cordova-simulate/pull/308), thanks to [@mfish33](https://github.com/mfish33)

## 0.7.0 (January 23, 2020)
* Fixed security vulnerabilities [#307](https://github.com/microsoft/cordova-simulate/pull/307)
* Updated Device, OS and user-agent list for iOS devices [#302](https://github.com/microsoft/cordova-simulate/pull/302), thanks to [@mfish33](https://github.com/mfish33)
* Added launch argument `--generateids` to generate unique UUIDs for simulated devices with UUID4 id format before simulate server launch [#303](https://github.com/microsoft/cordova-simulate/pull/303), thanks to [@mfish33](https://github.com/mfish33)

## 0.6.6 (August 27, 2019)
* Fix security vulnerabilities [#304](https://github.com/microsoft/cordova-simulate/pull/304)

## 0.6.5 (July 15, 2019)
* Fix security vulnerabilities [#300](https://github.com/microsoft/cordova-simulate/pull/300)

## 0.6.4 (July 11, 2019)
* Fix security vulnerabilities [#297](https://github.com/microsoft/cordova-simulate/pull/297), [#298](https://github.com/microsoft/cordova-simulate/pull/298) 

## 0.6.3 (July 1, 2019)
* Fix security vulnerabilities [#294](https://github.com/microsoft/cordova-simulate/pull/294)
* Fix documentation typos [#280](https://github.com/microsoft/cordova-simulate/pull/280), thanks to [Darío Hereñú(@kant)](https://github.com/kant)
* Migrate to Azure DevOps from Travis CI [#293](https://github.com/microsoft/cordova-simulate/pull/293)

## 0.6.2 (May 23, 2019)
* Return fix for [#105](https://github.com/microsoft/cordova-simulate/issues/105)
* Fix security vulnerabilities [#289](https://github.com/microsoft/cordova-simulate/pull/289)

## 0.6.1 (January 18, 2019)
* Fix security vulnerability WS-2017-0247 [#286](https://github.com/Microsoft/cordova-simulate/pull/286)

## 0.6.0 (January 17, 2019)
* Fix security vulnerabilities [#284](https://github.com/Microsoft/cordova-simulate/pull/284), [#278](https://github.com/Microsoft/cordova-simulate/pull/278)

## 0.5.1 (January 14, 2019)
* Temporarily undo fix for [#105](https://github.com/Microsoft/cordova-simulate/issues/105), more info [here](https://github.com/Microsoft/cordova-simulate/issues/105#issuecomment-453950879).

## 0.5.0 (December 26, 2018)
* Migrate to [cordova-serve@3.0.0](https://github.com/apache/cordova-serve/releases/tag/rel%2F3.0.0), which fixes several bugs affecting cordova-simulate: [apache/cordova-serve/#10](https://github.com/apache/cordova-serve/pull/10), [apache/cordova-serve/#14](https://github.com/apache/cordova-serve/pull/14)
* Breaking change: minimal version of supported Node.js is set to 6.0.0
* Fixed issue with CSS livereload doesn't pick up changes on Linux ([#105](https://github.com/Microsoft/cordova-simulate/issues/105)) 
* Improved geolocation ([#80](https://github.com/Microsoft/cordova-simulate/issues/80))
* Added support for host system camera and default camera image ([#234](https://github.com/Microsoft/cordova-simulate/pull/234))

## 0.4.0 (June 21, 2018)
* Migrate to [cordova-serve@2.0.1](https://github.com/apache/cordova-serve/releases/tag/rel%2F2.0.1)
* Fixed work with Cordova Android 7.0.0

## 0.3.15 (June 18, 2018)
* Fixed rendering in Chrome ([#265](https://github.com/Microsoft/cordova-simulate/pull/265))
* Fixed switcher for radio buttons in camera plugin ([#268](https://github.com/Microsoft/cordova-simulate/pull/268))

## 0.3.14 (March 6, 2018)
* Fixed an issue caused by differences in the path on some macOS installs ([#256](https://github.com/Microsoft/cordova-simulate/pull/256))

## 0.3.13 (Sept 20, 2017)
* Fix accessibility issue with GPX playback speed combobox ([#247](https://github.com/Microsoft/cordova-simulate/pull/247))

## 0.3.12 (May 22, 2017)
* Update with real translations ([ee5fa92](https://github.com/Microsoft/cordova-simulate/commit/ee5fa9242d8e514cb8995373dc826344cb18267f))

## 0.3.11 (May 19, 2017)
* Remove spurious CSS file from root folder

## 0.3.10 (May 19, 2017)
* Localization tool updates ([#240](https://github.com/Microsoft/cordova-simulate/pull/240), [#242](https://github.com/Microsoft/cordova-simulate/pull/242))
* Display arguments in "Unhandled Exec Call" dialog ([#231](https://github.com/Microsoft/cordova-simulate/pull/231))
* Fix Live Reload to handle deleted files ([#233](https://github.com/Microsoft/cordova-simulate/pull/233))
* Fix exception when HTML file contains a `<header>` tag ([#238](https://github.com/Microsoft/cordova-simulate/pull/238))
* Fix buttons not indicating focus and hover in high contrast mode in Internet Explorer ([#236](https://github.com/Microsoft/cordova-simulate/pull/236))
* Fix Live Reload failure with Ionic 2 templates and watcher task in Visual Studio ([#226](https://github.com/Microsoft/cordova-simulate/pull/226))
* Improvements for screen readers ([#222](https://github.com/Microsoft/cordova-simulate/pull/222), [#223](https://github.com/Microsoft/cordova-simulate/pull/223)) 

## 0.3.9 (Jan 5, 2017)
* Support scroll bar color in themes ([#221](https://github.com/Microsoft/cordova-simulate/pull/221))

## 0.3.8 (Dec 30, 2016)
* Update compass and accelerometer panel device widget to scale dynamically when font size changes ([#219](https://github.com/Microsoft/cordova-simulate/pull/219), [#220](https://github.com/Microsoft/cordova-simulate/pull/220))
* Update slider controls to work better in high contrast mode in IE ([#216](https://github.com/Microsoft/cordova-simulate/pull/216))

## 0.3.7 (Dec 5, 2016)
* Loc team pass on recent machine translated strings ([#213](https://github.com/Microsoft/cordova-simulate/pull/213), [#214](https://github.com/Microsoft/cordova-simulate/pull/214))

## 0.3.6 (Dec 1, 2016)
* Ensure XHR proxy forwards headers ([#212](https://github.com/Microsoft/cordova-simulate/pull/212))
* Don't localize 'alpha' ([#208](https://github.com/Microsoft/cordova-simulate/pull/208), [#209](https://github.com/Microsoft/cordova-simulate/pull/209))
* Support updating the current theme on the fly ([#205](https://github.com/Microsoft/cordova-simulate/pull/205), [#206](https://github.com/Microsoft/cordova-simulate/pull/206))
* Localize languages and day names in *Globalization* panel ([#204](https://github.com/Microsoft/cordova-simulate/pull/204))
* Ellipsize panel captions that are too wide to fit, and provide a tooltip ([#202](https://github.com/Microsoft/cordova-simulate/pull/202))
* Add tooltips to labeled values, so value can be seen when label is wide (in certain languages) ([#201](https://github.com/Microsoft/cordova-simulate/pull/201))

## 0.3.5 (Nov 16, 2016)
* Improved support for screen readers ([#185](https://github.com/Microsoft/cordova-simulate/pull/185), [#186](https://github.com/Microsoft/cordova-simulate/pull/186), [#189](https://github.com/Microsoft/cordova-simulate/pull/189), [#197](https://github.com/Microsoft/cordova-simulate/pull/197))
* Further keyboard improvements (`esc` closes dialogs, `del` deletes persisted exec calls, editable *Accelerometer* panel values) ([#188](https://github.com/Microsoft/cordova-simulate/pull/188), [#187](https://github.com/Microsoft/cordova-simulate/pull/187), [#190](https://github.com/Microsoft/cordova-simulate/pull/190)) 

## 0.3.4 (Oct 28, 2016)
* Now supports themes ([#175](https://github.com/Microsoft/cordova-simulate/pull/175)) - see [Support for Themes](https://github.com/Microsoft/cordova-simulate/wiki/Support-for-Themes) for more information.
* Updated compass that can be themed ([#172](https://github.com/Microsoft/cordova-simulate/pull/172))
* Modernized Accelerometer panel device ([#173](https://github.com/Microsoft/cordova-simulate/pull/173))
* Better keyboard support ([#180](https://github.com/Microsoft/cordova-simulate/pull/180), [#181](https://github.com/Microsoft/cordova-simulate/pull/181), [#182](https://github.com/Microsoft/cordova-simulate/pull/182))
* XHR proxy: ensure post data forwarded to proxied server ([#174](https://github.com/Microsoft/cordova-simulate/pull/174))
* Ensure elements within custom elements have unique ids ([#165](https://github.com/Microsoft/cordova-simulate/pull/165))

## 0.3.3 (Oct 4, 2016)
* Updated localized files with real translations ([#161](https://github.com/Microsoft/cordova-simulate/pull/161), [#162](https://github.com/Microsoft/cordova-simulate/pull/162), [#163](https://github.com/Microsoft/cordova-simulate/pull/163))

## 0.3.2 (Sep 29, 2016)
* Add localization support (currently machine localized for 13 languages - real translations coming soon)
  ([#153](https://github.com/Microsoft/cordova-simulate/pull/153), [#155](https://github.com/Microsoft/cordova-simulate/pull/155),
  [#156](https://github.com/Microsoft/cordova-simulate/pull/156), [#158](https://github.com/Microsoft/cordova-simulate/pull/158),
  [#159](https://github.com/Microsoft/cordova-simulate/pull/159)) 
* Updated Device panel and devices list ([#150](https://github.com/Microsoft/cordova-simulate/pull/150))

## 0.3.1 (Sep 17, 2016)
* Fix [#152](https://github.com/Microsoft/cordova-simulate/issues/152): Published package fails when run on command line (windows newline)
* Fix live-reload when launching from VS ([#151](https://github.com/Microsoft/cordova-simulate/pull/151))
* If prepare fails, display a warning and continue ([#149](https://github.com/Microsoft/cordova-simulate/pull/149))
* Adds ability to customize sim-host window title ([#147](https://github.com/Microsoft/cordova-simulate/pull/147))

## 0.3.0 (Aug 24, 2016)
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

## 0.2.3 (July 24, 2016)
* Use npm package for `send-transform` rather than github branch ([be26606e](https://github.com/Microsoft/cordova-simulate/commit/be26606e)).
* Position sim-host UI to the left rather than sort of centered ([5f082644](https://github.com/Microsoft/cordova-simulate/commit/5f082644)).

## 0.2.2 (July 21, 2016)
* Fix [#103](https://github.com/Microsoft/cordova-simulate/issues/103) Geolocation: Changing long / lat values using arrows does not update the map ([ce4b7649](https://github.com/Microsoft/cordova-simulate/commit/ce4b7649))
* Fix XHR proxy with non-standard ports ([9fd2ff36](https://github.com/Microsoft/cordova-simulate/commit/9fd2ff36))
* Validate input number to be always a number ([4ea94f6a](https://github.com/Microsoft/cordova-simulate/commit/4ea94f6a))
* Retry Cordova prepare if it fails the first time ([5456e44a](https://github.com/Microsoft/cordova-simulate/commit/5456e44a))

## 0.2.1 (June 30, 2016)
* Bootstrap protocol enhancements
* Multiple bug fixes and improvements

## 0.2.0 (June 9, 2016)
* Support for additional core plugins: cordova-plugin-battery-status, cordova-plugin-network-information, cordova-plugin-device-orientation, cordova-plugin-inappbrowser
* Live reload
* Touch events
* CORS proxy
* Device screen resizing
* Multiple bug fixes and improvements

## 0.1.3 (Oct 28, 2015)
* Adds support for some basic telemetry ([e547555f](https://github.com/Microsoft/taco-simulate-server/commit/e547555f)).
* Ensure server is closed if an error occurs ([ffe2b134](https://github.com/Microsoft/taco-simulate-server/commit/ffe2b134)).
* Expose `server` and `log` ([d0dc5224](https://github.com/Microsoft/taco-simulate-server/commit/d0dc5224)).

## 0.1.2 (Oct 13, 2015)
* Better handled scenarios with no success/fail methods ([0805ad28](https://github.com/Microsoft/taco-simulate-server/commit/0805ad28)).
* Handle plugins with "old style" id ([5b46fddb](https://github.com/Microsoft/taco-simulate-server/commit/5b46fddb)).

## 0.1.1 (Oct 8, 2015)
* Restore missing utils.navHelper() method ([63ef7679](https://github.com/Microsoft/taco-simulate-server/commit/63ef7679)).

## 0.1.0 (Oct 8, 2015)
* Initial test release
