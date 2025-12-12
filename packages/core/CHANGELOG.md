# Changelog

## [0.27.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.26.0...seasons-and-stars-v0.27.0) (2025-12-12)


### Features

* **i18n:** update Polish translate ([#514](https://github.com/rayners/fvtt-seasons-and-stars/issues/514)) ([d372b0e](https://github.com/rayners/fvtt-seasons-and-stars/commit/d372b0e5b8896230c4081a486cf933971d346378))

## [0.26.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.25.0...seasons-and-stars-v0.26.0) (2025-12-07)


### Features

* add day change notifications to chat log ([#506](https://github.com/rayners/fvtt-seasons-and-stars/issues/506)) ([5e0c00d](https://github.com/rayners/fvtt-seasons-and-stars/commit/5e0c00d9a03ee8a3a8ee24f0525800d3791a314e))
* add optional year display to mini widget ([#491](https://github.com/rayners/fvtt-seasons-and-stars/issues/491)) ([23cb659](https://github.com/rayners/fvtt-seasons-and-stars/commit/23cb6596b1c8097f6814ae08372b5f2fc733a610))
* add solar anchors for sunrise/sunset interpolation ([#492](https://github.com/rayners/fvtt-seasons-and-stars/issues/492)) ([4825442](https://github.com/rayners/fvtt-seasons-and-stars/commit/4825442268d7df68cf5523a5b8867290777cafb2))
* add support for 12-hour clock format with am/pm notation ([#500](https://github.com/rayners/fvtt-seasons-and-stars/issues/500)) ([76746b7](https://github.com/rayners/fvtt-seasons-and-stars/commit/76746b7031001bc374ced23551e0e0dab0791f80))
* add week-of-month naming system for calendars ([#490](https://github.com/rayners/fvtt-seasons-and-stars/issues/490)) ([e983821](https://github.com/rayners/fvtt-seasons-and-stars/commit/e983821bf0dc0f330e7722937e2942817ac6df54))
* **calendar-builder:** add load current calendar button ([#481](https://github.com/rayners/fvtt-seasons-and-stars/issues/481)) ([8532527](https://github.com/rayners/fvtt-seasons-and-stars/commit/85325272fb86726c4fe5a787318989203c54ca67))
* **calendar-builder:** implement interactive weekdays tab ([#477](https://github.com/rayners/fvtt-seasons-and-stars/issues/477)) ([0ee869d](https://github.com/rayners/fvtt-seasons-and-stars/commit/0ee869dc4b96c6176fd4431419ea15f8be236a9f))
* **i18n:** cs for SaS 0.25.0 ([#466](https://github.com/rayners/fvtt-seasons-and-stars/issues/466)) ([e1f0348](https://github.com/rayners/fvtt-seasons-and-stars/commit/e1f034849dc04ee1c4dd83690db3a4eacad25d62))
* **i18n:** update Polish translate ([#494](https://github.com/rayners/fvtt-seasons-and-stars/issues/494)) ([799f079](https://github.com/rayners/fvtt-seasons-and-stars/commit/799f079dd6db7c4d4b74212026009001b8fcde66))
* redesign calendar selection dialog with master-detail layout ([#508](https://github.com/rayners/fvtt-seasons-and-stars/issues/508)) ([1ac8ed1](https://github.com/rayners/fvtt-seasons-and-stars/commit/1ac8ed14372d2bf90751276e53263814bb3415d1))


### Bug Fixes

* prevent spurious day change notification on page refresh ([#509](https://github.com/rayners/fvtt-seasons-and-stars/issues/509)) ([e750ac0](https://github.com/rayners/fvtt-seasons-and-stars/commit/e750ac08afaa0c8bf51cd75999b1d9ccefffa235))
* **ui:** scope .dialog-buttons selector to prevent global CSS leak ([#498](https://github.com/rayners/fvtt-seasons-and-stars/issues/498)) ([134de59](https://github.com/rayners/fvtt-seasons-and-stars/commit/134de592970598df88a6e48b78a2f37823540fa1)), closes [#485](https://github.com/rayners/fvtt-seasons-and-stars/issues/485)
* use FilePicker.implementation for Forge compatibility ([#504](https://github.com/rayners/fvtt-seasons-and-stars/issues/504)) ([04aaea9](https://github.com/rayners/fvtt-seasons-and-stars/commit/04aaea9d015b080c31eaca4f8af69d6419ff7f93))

## [0.25.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.24.1...seasons-and-stars-v0.25.0) (2025-11-10)


### Features

* add sunrise and sunset times to seasons with interpolation ([#460](https://github.com/rayners/fvtt-seasons-and-stars/issues/460)) ([9cbe4db](https://github.com/rayners/fvtt-seasons-and-stars/commit/9cbe4dbccc2cf0468fc6e45fa6d1cda3b1644be1))
* add support for iconUrl in calendar icons ([#441](https://github.com/rayners/fvtt-seasons-and-stars/issues/441)) ([20aa69f](https://github.com/rayners/fvtt-seasons-and-stars/commit/20aa69ffe9e1b57fbfd1f4494a61cca5c7845c3e))
* **i18n:** update pl.json ([#451](https://github.com/rayners/fvtt-seasons-and-stars/issues/451)) ([c8271df](https://github.com/rayners/fvtt-seasons-and-stars/commit/c8271df202c686e714f88fdcd2072caf1dd28a1f))
* implement Foundry v13 calendar integration ([#446](https://github.com/rayners/fvtt-seasons-and-stars/issues/446)) ([61b022b](https://github.com/rayners/fvtt-seasons-and-stars/commit/61b022b835d7b4b71d59a0a13b747da4eea71a1e))


### Bug Fixes

* remove redundant 30-second auto-update from CalendarWidget ([#461](https://github.com/rayners/fvtt-seasons-and-stars/issues/461)) ([70f854e](https://github.com/rayners/fvtt-seasons-and-stars/commit/70f854e0ab7caf53a5937ee74a320964b9c02f68))

## [0.24.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.24.0...seasons-and-stars-v0.24.1) (2025-10-30)


### Bug Fixes

* replace calendar dropdown with menu button ([#448](https://github.com/rayners/fvtt-seasons-and-stars/issues/448)) ([80d2c64](https://github.com/rayners/fvtt-seasons-and-stars/commit/80d2c642fa1d339ca89564c1a2e92de3a7966f7d))

## [0.24.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.23.1...seasons-and-stars-v0.24.0) (2025-10-28)


### Features

* improve create note dialog with validation and add another button ([#428](https://github.com/rayners/fvtt-seasons-and-stars/issues/428)) ([c18cb0b](https://github.com/rayners/fvtt-seasons-and-stars/commit/c18cb0b1201b35b3471fe9f4aa53724f0e59d350))


### Bug Fixes

* hide calendar pack notice when packs are installed ([#433](https://github.com/rayners/fvtt-seasons-and-stars/issues/433)) ([adf6f34](https://github.com/rayners/fvtt-seasons-and-stars/commit/adf6f34766c9982f73b2d47f1c0287a6047905e7))
* migrate year setting dialog to DialogV2 ([#424](https://github.com/rayners/fvtt-seasons-and-stars/issues/424)) ([62bb646](https://github.com/rayners/fvtt-seasons-and-stars/commit/62bb6466c90f3feba2881e611fc39d7930f480e7))

## [0.23.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.23.0...seasons-and-stars-v0.23.1) (2025-10-24)


### Bug Fixes

* use dialogV2 instance parameter instead of outer variable ([#415](https://github.com/rayners/fvtt-seasons-and-stars/issues/415)) ([6872be0](https://github.com/rayners/fvtt-seasons-and-stars/commit/6872be04440014b446635bdec7062ac950ec8f46))

## [0.23.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.22.1...seasons-and-stars-v0.23.0) (2025-10-23)


### Features

* **core:** add support for seasons crossing year boundaries ([#395](https://github.com/rayners/fvtt-seasons-and-stars/issues/395)) ([bf44b6d](https://github.com/rayners/fvtt-seasons-and-stars/commit/bf44b6d6987c946f921f1fce9097b8f233063e1d))
* **events:** add multi-day event support ([#411](https://github.com/rayners/fvtt-seasons-and-stars/issues/411)) ([2d51304](https://github.com/rayners/fvtt-seasons-and-stars/commit/2d51304c6a36f074167456da71fd0ea188e8553c))
* **ui:** modernize grid widget design and add event indicators ([#413](https://github.com/rayners/fvtt-seasons-and-stars/issues/413)) ([ef0d47d](https://github.com/rayners/fvtt-seasons-and-stars/commit/ef0d47d3852767d1b9fc6d960a9e7662e69a0e6d))


### Bug Fixes

* display intercalary days with 'before' property in grid widget ([#397](https://github.com/rayners/fvtt-seasons-and-stars/issues/397)) ([a7f7152](https://github.com/rayners/fvtt-seasons-and-stars/commit/a7f7152f833b5f7a72af1d899e9d138720b967f1))

## [0.22.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.22.0...seasons-and-stars-v0.22.1) (2025-10-17)


### Bug Fixes

* **core:** add intercalary property to template context for Handlebars ([#388](https://github.com/rayners/fvtt-seasons-and-stars/issues/388)) ([2511b67](https://github.com/rayners/fvtt-seasons-and-stars/commit/2511b67e9bec185fa380a0a76a1c32544018bfd6))

## [0.22.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.21.0...seasons-and-stars-v0.22.0) (2025-10-15)


### Features

* add context menu for display options ([#383](https://github.com/rayners/fvtt-seasons-and-stars/issues/383)) ([933277d](https://github.com/rayners/fvtt-seasons-and-stars/commit/933277d073617e842215de72acaf25603e931f23))
* **i18n:** update pl.json ([#384](https://github.com/rayners/fvtt-seasons-and-stars/issues/384)) ([b2c1487](https://github.com/rayners/fvtt-seasons-and-stars/commit/b2c1487a9147cccb82e85d5636a8bea8d0e90fa6))
* migrate to Foundry native tooltips ([#378](https://github.com/rayners/fvtt-seasons-and-stars/issues/378)) ([5d67d48](https://github.com/rayners/fvtt-seasons-and-stars/commit/5d67d482d14e0d1106911345689ce51332039b4e))


### Bug Fixes

* implement lazy initialization for EventsManager to prevent warnings during time advancement ([#380](https://github.com/rayners/fvtt-seasons-and-stars/issues/380)) ([d1a5676](https://github.com/rayners/fvtt-seasons-and-stars/commit/d1a5676e99161bded5a06780cc938ef658c790bd))
* put Error object first for Errors & Echoes compatibility ([#382](https://github.com/rayners/fvtt-seasons-and-stars/issues/382)) ([52c8d82](https://github.com/rayners/fvtt-seasons-and-stars/commit/52c8d82d07b0f78ed4b438dfd1b42840a23a955e))

## [0.21.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.20.4...seasons-and-stars-v0.21.0) (2025-10-13)


### ⚠ BREAKING CHANGES

* Moon phase data now includes moonColorIndex field

### Features

* add moon phase icons to mini widget ([#368](https://github.com/rayners/fvtt-seasons-and-stars/issues/368)) ([4db6708](https://github.com/rayners/fvtt-seasons-and-stars/commit/4db67084542f5f5ca12a4119f07e1d94575a5fad))


### Bug Fixes

* cache calendar data during onChange to prevent race condition ([#370](https://github.com/rayners/fvtt-seasons-and-stars/issues/370)) ([03ca799](https://github.com/rayners/fvtt-seasons-and-stars/commit/03ca79921bc002325c177c90e88dce8920309bd9))
* support both 'before' and 'after' for intercalary days ([#362](https://github.com/rayners/fvtt-seasons-and-stars/issues/362)) ([ff362f0](https://github.com/rayners/fvtt-seasons-and-stars/commit/ff362f0085d043369cced6f28717eaec5d6fcedc))

## [0.20.4](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.20.3...seasons-and-stars-v0.20.4) (2025-10-12)


### Bug Fixes

* prevent active calendar reset on Foundry reload ([#364](https://github.com/rayners/fvtt-seasons-and-stars/issues/364)) ([5881b70](https://github.com/rayners/fvtt-seasons-and-stars/commit/5881b70bf873dfdebddaf41d8c4baaf20b825e73))

## [0.20.3](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.20.2...seasons-and-stars-v0.20.3) (2025-10-11)


### Bug Fixes

* improve error messages for unexpected properties ([#358](https://github.com/rayners/fvtt-seasons-and-stars/issues/358)) ([30b5941](https://github.com/rayners/fvtt-seasons-and-stars/commit/30b5941f811aaf2ac0ce4dd6cba1977d1fd91789))

## [0.20.2](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.20.1...seasons-and-stars-v0.20.2) (2025-10-09)


### Bug Fixes

* prevent non-GM permission errors and improve file picker UX ([#353](https://github.com/rayners/fvtt-seasons-and-stars/issues/353)) ([e105075](https://github.com/rayners/fvtt-seasons-and-stars/commit/e105075c1a6ab272ff88015a030fdddedf63bda3))

## [0.20.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.20.0...seasons-and-stars-v0.20.1) (2025-10-08)


### Bug Fixes

* ensure sidebar template part always renders single root element ([#346](https://github.com/rayners/fvtt-seasons-and-stars/issues/346)) ([9177a95](https://github.com/rayners/fvtt-seasons-and-stars/commit/9177a953e4366b7f507adf47cee551d7a22bd0cd))

## [0.20.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.19.0...seasons-and-stars-v0.20.0) (2025-10-08)


### Features

* add event occurrence hooks and reference calendar events ([#340](https://github.com/rayners/fvtt-seasons-and-stars/issues/340)) ([54d7403](https://github.com/rayners/fvtt-seasons-and-stars/commit/54d74031b112e395c8fcb58911c149e9eb5a6816))
* create custom calendar builder package ([#311](https://github.com/rayners/fvtt-seasons-and-stars/issues/311)) ([bf9f11a](https://github.com/rayners/fvtt-seasons-and-stars/commit/bf9f11af21bb6c8e0268c73a2b0ec921e2afbce9))
* **ui:** implement sidebar button registry system ([#334](https://github.com/rayners/fvtt-seasons-and-stars/issues/334)) ([2c0ddef](https://github.com/rayners/fvtt-seasons-and-stars/commit/2c0ddefd2ed58349faf7e02a212055e87cd1f9b8))
* **ui:** improve main calendar widget layout and styling ([#339](https://github.com/rayners/fvtt-seasons-and-stars/issues/339)) ([739a9ae](https://github.com/rayners/fvtt-seasons-and-stars/commit/739a9aec8f29de43802c0b1419f7c2907bcd0b9b))


### Bug Fixes

* **calendar-builder:** eliminate TypeScript build warnings ([#338](https://github.com/rayners/fvtt-seasons-and-stars/issues/338)) ([718afae](https://github.com/rayners/fvtt-seasons-and-stars/commit/718afae9c69f9956df617e567ca6210a47cf4b02))

## [0.19.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.18.0...seasons-and-stars-v0.19.0) (2025-10-01)


### Features

* allow non-GM users to open calendar widgets ([#328](https://github.com/rayners/fvtt-seasons-and-stars/issues/328)) ([4254f39](https://github.com/rayners/fvtt-seasons-and-stars/commit/4254f39f0ce0868af915bbec03aed470238443af))

## [0.18.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.17.1...seasons-and-stars-v0.18.0) (2025-09-27)


### Features

* add support for negative leap days ([#304](https://github.com/rayners/fvtt-seasons-and-stars/issues/304)) ([9790c02](https://github.com/rayners/fvtt-seasons-and-stars/commit/9790c02a8cd9465c9df166066db1c4fa7ae3b406))
* make minimum real time advancement interval configurable ([#296](https://github.com/rayners/fvtt-seasons-and-stars/issues/296)) ([c863ac3](https://github.com/rayners/fvtt-seasons-and-stars/commit/c863ac324c7d581b2c6955e9b54087576a9691d5))


### Bug Fixes

* calendar settings dropdown shows only Gregorian instead of full list ([#316](https://github.com/rayners/fvtt-seasons-and-stars/issues/316)) ([1088fa0](https://github.com/rayners/fvtt-seasons-and-stars/commit/1088fa0d009053ddd41c4c4e48f1ac8af59cb0aa))
* resolve time advancement race condition in widget toggle logic ([#313](https://github.com/rayners/fvtt-seasons-and-stars/issues/313)) ([4e4749d](https://github.com/rayners/fvtt-seasons-and-stars/commit/4e4749d88833156f8ce24ee66408d15d165a582b))
* **ui:** handle array vs map mismatch in calendar count check ([#315](https://github.com/rayners/fvtt-seasons-and-stars/issues/315)) ([6d61d95](https://github.com/rayners/fvtt-seasons-and-stars/commit/6d61d957a382551ac3da00be086a49f269742610))

## [0.17.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.17.0...seasons-and-stars-v0.17.1) (2025-09-24)


### Bug Fixes

* add missing repository metadata to all packages ([#300](https://github.com/rayners/fvtt-seasons-and-stars/issues/300)) ([d7499ef](https://github.com/rayners/fvtt-seasons-and-stars/commit/d7499ef4a6ec5f232118469a56acf8238542b38a))

## [0.17.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.16.0...seasons-and-stars-v0.17.0) (2025-09-23)


### Features

* align Golarion leap cycle with lore ([#265](https://github.com/rayners/fvtt-seasons-and-stars/issues/265)) ([5ff3942](https://github.com/rayners/fvtt-seasons-and-stars/commit/5ff3942bc4150dfabe5c94c2dba0ab843e03dc45))
* **scifi-pack:** add Coriolis calendars for Third Horizon and The Great Dark ([#286](https://github.com/rayners/fvtt-seasons-and-stars/issues/286)) ([2057ead](https://github.com/rayners/fvtt-seasons-and-stars/commit/2057ead6de86d268f68e9d5b2a252741a34fe6f1))
* verify calendar source availability ([#270](https://github.com/rayners/fvtt-seasons-and-stars/issues/270)) ([50b286a](https://github.com/rayners/fvtt-seasons-and-stars/commit/50b286ac41d4cb0531c01c24be678bb7b2291fa5))


### Bug Fixes

* **ui:** mini widget width flexes to match the contents ([#274](https://github.com/rayners/fvtt-seasons-and-stars/issues/274)) ([4d871f5](https://github.com/rayners/fvtt-seasons-and-stars/commit/4d871f5a1a78ddb1f9d9f2a546ec239049a22935))

## [0.16.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.15.0...seasons-and-stars-v0.16.0) (2025-09-20)


### Features

* add headless testing architecture with Playwright ([#237](https://github.com/rayners/fvtt-seasons-and-stars/issues/237)) ([8e01b9d](https://github.com/rayners/fvtt-seasons-and-stars/commit/8e01b9de3d7ecdaea52526719d5b36815dd6c061))
* **core:** add synchronous initialization for improved bridge compatibility ([#259](https://github.com/rayners/fvtt-seasons-and-stars/issues/259)) ([fd1cfb8](https://github.com/rayners/fvtt-seasons-and-stars/commit/fd1cfb8c652070ed21ab9294ea41e2b9c076a246))


### Bug Fixes

* add viewport bounds checking to mini calendar widget ([#258](https://github.com/rayners/fvtt-seasons-and-stars/issues/258)) ([1639210](https://github.com/rayners/fvtt-seasons-and-stars/commit/16392102327be001744d649cc668cdc08daeeaa3))

## [0.15.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.14.0...seasons-and-stars-v0.15.0) (2025-09-16)


### Features

* **core:** add movable mini widget with pinning ([#251](https://github.com/rayners/fvtt-seasons-and-stars/issues/251)) ([9890ac9](https://github.com/rayners/fvtt-seasons-and-stars/commit/9890ac903517390372738257815101a38e9f465c))

## [0.14.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.13.0...seasons-and-stars-v0.14.0) (2025-09-15)


### Features

* **i18n:** update pl.json ([#221](https://github.com/rayners/fvtt-seasons-and-stars/issues/221)) ([efc0a3e](https://github.com/rayners/fvtt-seasons-and-stars/commit/efc0a3ec4c44a2fbb006b7579ad7c98bbc2cf30c))


### Bug Fixes

* handle calendar engine creation failures ([#235](https://github.com/rayners/fvtt-seasons-and-stars/issues/235)) ([ada8c0a](https://github.com/rayners/fvtt-seasons-and-stars/commit/ada8c0a395fe21e9dff2d586d4364bb6b31ecc58))
* hide calendar selector for non-GM users ([#228](https://github.com/rayners/fvtt-seasons-and-stars/issues/228)) ([869e87c](https://github.com/rayners/fvtt-seasons-and-stars/commit/869e87c8cfb9e72868a7f9f95f93c41e7c16dbbd))
* intercalary day display with -intercalary format scheme ([#247](https://github.com/rayners/fvtt-seasons-and-stars/issues/247)) ([daf8ccc](https://github.com/rayners/fvtt-seasons-and-stars/commit/daf8cccd38e79c11836f393a4109c817b8cb15d4))


### Performance Improvements

* increase real time advancement interval to 10 seconds ([#229](https://github.com/rayners/fvtt-seasons-and-stars/issues/229)) ([9629e6f](https://github.com/rayners/fvtt-seasons-and-stars/commit/9629e6f4a5cc3a445e3d7428cee28b8091132dc8))

## [0.13.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.12.0...seasons-and-stars-v0.13.0) (2025-09-02)


### Features

* add FilePicker support for custom calendar files ([#218](https://github.com/rayners/fvtt-seasons-and-stars/issues/218)) ([a4c0493](https://github.com/rayners/fvtt-seasons-and-stars/commit/a4c0493d820e07a49a99761066b6dc84f85c0b9a))

## [0.12.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.11.0...seasons-and-stars-v0.12.0) (2025-08-26)


### Features

* add game pause/unpause sync for time advancement (fixes [#207](https://github.com/rayners/fvtt-seasons-and-stars/issues/207)) ([#209](https://github.com/rayners/fvtt-seasons-and-stars/issues/209)) ([287862c](https://github.com/rayners/fvtt-seasons-and-stars/commit/287862ca9bc8819b7840a314300d1f6d69d9d074))
* implement canonical hours functionality (fixes [#187](https://github.com/rayners/fvtt-seasons-and-stars/issues/187)) ([#205](https://github.com/rayners/fvtt-seasons-and-stars/issues/205)) ([7f8599b](https://github.com/rayners/fvtt-seasons-and-stars/commit/7f8599ba70ff41078fbb8b7529ecf85805c2ba55))

## [0.11.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.10.0...seasons-and-stars-v0.11.0) (2025-08-19)


### Features

* switch mini widget click behaviors for improved UX ([#201](https://github.com/rayners/fvtt-seasons-and-stars/issues/201)) ([5c7392d](https://github.com/rayners/fvtt-seasons-and-stars/commit/5c7392d496599a571ca2112caa827d4723eebd65))


### Bug Fixes

* restrict combat time advancement resume to GMs only ([#200](https://github.com/rayners/fvtt-seasons-and-stars/issues/200)) ([8e46a59](https://github.com/rayners/fvtt-seasons-and-stars/commit/8e46a59f52047bb39d22fee92062a71d96b899ec))

## [0.10.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.9.1...seasons-and-stars-v0.10.0) (2025-08-09)


### Features

* add always show quick time buttons setting ([#171](https://github.com/rayners/fvtt-seasons-and-stars/issues/171)) ([fc61007](https://github.com/rayners/fvtt-seasons-and-stars/commit/fc610076e6b2135fd49384aee303f79bc8185928))
* add configurable day-of-week display to mini-widget ([#179](https://github.com/rayners/fvtt-seasons-and-stars/issues/179)) ([c25d74f](https://github.com/rayners/fvtt-seasons-and-stars/commit/c25d74f3675f205c1fff2c316a34bc09c8e92af1))
* add dedicated mini widget quick time button configuration ([#181](https://github.com/rayners/fvtt-seasons-and-stars/issues/181)) ([53f28db](https://github.com/rayners/fvtt-seasons-and-stars/commit/53f28dbcb8469b41dbf86ce31d2efe2ea08acc3a))
* add optional time display to mini calendar widget ([#172](https://github.com/rayners/fvtt-seasons-and-stars/issues/172)) ([07d393a](https://github.com/rayners/fvtt-seasons-and-stars/commit/07d393a56c2b27ff2da65723dc4c65221db019ef))
* add Roshar calendar support for Stormlight Archive campaigns ([#170](https://github.com/rayners/fvtt-seasons-and-stars/issues/170)) ([c195051](https://github.com/rayners/fvtt-seasons-and-stars/commit/c195051c0bf070c69fde12d01b9ab5fddc0d77d3))
* add support for before intercalary days ([#180](https://github.com/rayners/fvtt-seasons-and-stars/issues/180)) ([1913d21](https://github.com/rayners/fvtt-seasons-and-stars/commit/1913d214fcd40aa9ab895853af49511daf6077a8))
* enhance calendar dialog styling and usability ([#176](https://github.com/rayners/fvtt-seasons-and-stars/issues/176)) ([ed4b60e](https://github.com/rayners/fvtt-seasons-and-stars/commit/ed4b60efc9f3f1fd1dcd27645555051ddc81fc25))
* extract PF2e functionality into dedicated package ([#156](https://github.com/rayners/fvtt-seasons-and-stars/issues/156)) ([423a358](https://github.com/rayners/fvtt-seasons-and-stars/commit/423a358e905c565a2f8b78922affe76534e5d9a6))
* implement play/pause time advancement with combat auto-pause ([#175](https://github.com/rayners/fvtt-seasons-and-stars/issues/175)) ([406cd42](https://github.com/rayners/fvtt-seasons-and-stars/commit/406cd42a3b17e0956f665208bcd6d89143bb3336))

## [0.9.1](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.9.0...seasons-and-stars-v0.9.1) (2025-07-23)


### Bug Fixes

* golarion calendar year offset bug for variants ([#154](https://github.com/rayners/fvtt-seasons-and-stars/issues/154)) ([80a9a81](https://github.com/rayners/fvtt-seasons-and-stars/commit/80a9a81c90e6d067299a7c33e7895463214217af))

## [0.9.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.8.0...seasons-and-stars-v0.9.0) (2025-07-21)


### Features

* add GM warning dialog for calendar deprecation ([#158](https://github.com/rayners/fvtt-seasons-and-stars/issues/158)) ([eda42dd](https://github.com/rayners/fvtt-seasons-and-stars/commit/eda42dde7ee2cf3affbd04e19d052af4bc09aa49))
* add negative quick time button to default ([#152](https://github.com/rayners/fvtt-seasons-and-stars/issues/152)) ([5f866e5](https://github.com/rayners/fvtt-seasons-and-stars/commit/5f866e5d23042575aa4573f066e9629c920d3ef5))


### Bug Fixes

* eliminate ReDoS vulnerabilities by migrating to Handlebars helper architecture ([#155](https://github.com/rayners/fvtt-seasons-and-stars/issues/155)) ([54ce66b](https://github.com/rayners/fvtt-seasons-and-stars/commit/54ce66b3df0cc1cd585c0572704134da1ad0f5a4))

## [0.8.0](https://github.com/rayners/fvtt-seasons-and-stars/compare/seasons-and-stars-v0.7.0...seasons-and-stars-v0.8.0) (2025-07-18)


### Features

* add external calendar registration hook system ([#150](https://github.com/rayners/fvtt-seasons-and-stars/issues/150)) ([0eeab2d](https://github.com/rayners/fvtt-seasons-and-stars/commit/0eeab2d2aaffb5432ebef5713dff537ca2b72fe3))
* Complete Seasons & Stars monorepo migration ([#139](https://github.com/rayners/fvtt-seasons-and-stars/issues/139)) ([e667ebd](https://github.com/rayners/fvtt-seasons-and-stars/commit/e667ebdc3b4cdc9f64bebc03b075136b495cac60))
