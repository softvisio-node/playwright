<!-- !!! DO NOT EDIT, THIS FILE IS GENERATED AUTOMATICALLY !!!  -->

> ℹ️ Please, see the full project documentation here:<br><https://c0rejs.github.io/playwright/>

# Introduction

Provides set of patches and extensions for `playwright`.

You can find original playwright API documentation [here](https://playwright.dev/docs/api/class-playwright/).

## Install

```sh
npm install @c0rejs/playwright
```

It doesn't installs any browsers by default, so if you need `chromiun` you need to install it manually:

```sh
npx playwright install chromium
```

## Usage

```javascript
import playwright from "@c0rejs/playwright";
```

## Class: BrowserType

Patch for the original BrowserType class. Adds following changes:

- `headless` By default under `windows` headless is set to the `false` for other platforms to the `true`.
- `executablePath` By default for `linux` platform is set to the `"/usr/bin/google-chrome-stable"`.
- `proxy` By default adds proxy server loopback that bypass all requests. It can be overridden in the browser contexts.

## Class: Browser

### browser.isHeadless

- Returns: {boolean} `true` if browser started in the `headless` mode.

### browser.newContext( options )

- `options` {Object} New context options. Below are enumerated only the changes for the original API method:
    - `stealth` {boolean} Enables various stealth mode extensions, which helps to hide `headless` mode. **Default:** `true`.
    - `proxy` {string|ProxyClient|Object} Added support for {ProxyClient}. If {string} is provided it will be passed to the {ProxyClient} constructor as URL.

## Class: Page

### page.imagesIsDisabled

- Returns: {boolean} `true` if images is currently disabled.

### page.disableImages()

Sets `route` filter, which filters out images requests.

## Resources

<https://httpbin.org/user-agent>

<http://www.ip-score.com>

<https://arh.antoinevastel.com/bots/areyouheadless>

<https://bot.sannysoft.com>

<https://antoinevastel.com/bots/>
