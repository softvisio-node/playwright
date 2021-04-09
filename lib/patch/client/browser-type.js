// NOTE
// flags explained: https://peter.sh/experiments/chromium-command-line-switches/
// default flags: https://github.com/puppeteer/puppeteer/blob/master/lib/Launcher.js#L269
// AWS Lambda flags: https://github.com/alixaxel/chrome-aws-lambda/blob/10feb8d162626d34aad2ee1e657f20956f53fe11/source/index.js
const DEFAULT_ARGS = [
    "--start-maximized",
    "--no-default-browser-check",

    "--disable-notifications", // disables the Web Notification and the Push APIs
    // "--noerrdialogs", // TBD suppresses all error dialogs when present

    // SECURITY
    // "--disable-web-security", // don't enforce the same-origin policy

    // PERFORMANCE
    // "--no-sandbox", // applied by default, to turn off use chromiumSandbox: true
    "--disable-gpu",
    "--enable-tcp-fast-open", // https://wiki.mikejung.biz/Chrome#Enable_Chrome_TCP_Fast_Open_.28Linux_.2F_Android_Only.29
    "--enable-async-dns", // https://wiki.mikejung.biz/Chrome#Enforce_Async_DNS_with_Chrome
    // "--no-zygote", // https://chromium.googlesource.com/chromium/src/+/master/docs/linux/zygote.md
    // "--single-process", // incompatible with incognito
];

const browserType = require( "playwright-core/lib/client/browserType" );

browserType.BrowserType = class extends browserType.BrowserType {
    async launch ( options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launch( options );

        browser.isHeadless = !!options.headless;

        return browser;
    }

    async launchPersistentContext ( userDataDir, options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launchPersistentContext( userDataDir, options );

        browser.isHeadless = !!options.headless;

        return browser;
    }

    async launchServer ( options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launchServer( options );

        browser.isHeadless = !!options.headless;

        return browser;
    }

    #prepareOptions ( options = {} ) {
        options = { ...options };

        if ( !( "headless" in options ) ) options.headless = process.platform === "win32" ? false : true;

        if ( this._initializer.name === "chromium" ) {
            options.args = [...DEFAULT_ARGS, ...( options.args || [] )];

            if ( !( "executablePath" in options ) && process.platform === "linux" ) {
                options.executablePath = "/usr/bin/google-chrome-stable"; // chromium-browser
            }

            if ( !( "proxy" in options ) ) {
                options.proxy = {
                    "server": "-",
                    "bypass": "*",
                };
            }
        }

        return options;
    }
};
