// NOTE
// flags explained: https://peter.sh/experiments/chromium-command-line-switches/
// default flags: https://github.com/puppeteer/puppeteer/blob/master/lib/Launcher.js#L269
// AWS Lambda flags: https://github.com/alixaxel/chrome-aws-lambda/blob/10feb8d162626d34aad2ee1e657f20956f53fe11/source/index.js
import Browser from "#core/browser";

const DEFAULT_ARGS = [
    "--start-maximized",

    // "--no-default-browser-check", // not used

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

const { "default": browserType } = await import( new URL( "lib/client/browserType.js", import.meta.resolve( "playwright-core" ) ) );

browserType.BrowserType = class BrowserType extends browserType.BrowserType {

    // public
    async connect ( options ) {
        const browser = await super.connect( options );

        this.#patchBrowser( browser, true );

        return browser;
    }

    async launch ( options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launch( options );

        this.#patchBrowser( browser, options.headless );

        return browser;
    }

    async launchPersistentContext ( userDataDir, options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launchPersistentContext( userDataDir, options );

        this.#patchBrowser( browser, options.headless );

        return browser;
    }

    async launchServer ( options ) {
        options = this.#prepareOptions( options );

        const browser = await super.launchServer( options );

        this.#patchBrowser( browser, options.headless );

        return browser;
    }

    // private
    #prepareOptions ( options = {} ) {
        options = structuredClone( options );

        options.headless ??= process.platform === "win32"
            ? false
            : true;

        if ( this._initializer.name === "chromium" ) {
            options.args = [

                //
                ...DEFAULT_ARGS,
                ...( options.args || [] ),
            ];

            if ( !options.channel && !options.executablePath ) {
                let browser;

                if ( options.headless ) {
                    browser = Browser.defaultChromiumHeadlessBrowser;
                }
                else {
                    browser = Browser.defaultChromiumBrowser;
                }

                if ( browser ) {
                    options.channel = browser.channel;
                    options.executablePath = browser.executablePath;
                }
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

    #patchBrowser ( browser, isHeadless ) {
        isHeadless = Boolean( isHeadless );

        Object.defineProperties( browser, {
            "isHeadless": {
                "configurable": false,
                "enumerable": false,
                get () {
                    return isHeadless;
                },
            },
        } );
    }
};
