# Changelog

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
