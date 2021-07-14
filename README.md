<!-- !!! DO NOT EDIT, THIS FILE IS GENERATED AUTOMATICALLY !!!  -->

> :information_source: Please, see the full project documentation here: [https://softvisio.github.io/playwright/](https://softvisio.github.io/playwright/).

# Introduction

Provides set of patches and extensions for `playwright`.

You can find original playwright API documentation [here](https://playwright.dev/docs/api/class-playwright/).

## Install

```shell
npm i @softvisio/playwright
```

It doesn't installs any browsers by default, so if you need `chromiun` you need to install it manually:

```shell
npx playwright install chromium
```

## Usage

```javascript
import playwright from "@softvisio/playwright";
```

## Class: BrowserDevices

```javascript
playwright.device.random();
```

### device.random()

-   Returns: <Object\> Random device profile.

### device.desktop()

-   Returns: <Object\> Random desktop device profile.

### device.mobile()

-   Returns: <Object\> Random mobile device profile.

### device.windows()

-   Returns: <Object\> Random windows device profile.

### device.windows10()

-   Returns: <Object\> Random windows10 device profile.

### device.linux()

-   Returns: <Object\> Random linux device profile.

### device.ipad()

-   Returns: <Object\> Random iPad device profile.
