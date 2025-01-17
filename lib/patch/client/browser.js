import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";
import UserAgent from "#core/user-agent";

// init stealth plugin
const DISABLED_STEALTH_PLUGINS = new Set( [

        // covered by context "locales" option
        "navigator.languages",

        "navigator.vendor",
        "user-agent-override",
    ] ),
    WEBGL = {
        "default": {
            "vendor": "Intel Inc.",
            "renderer": "Intel Iris OpenGL Engine",
        },
        "iphone": {
            "vendor": "Apple Inc.",
            "renderer": "Apple GPU",
        },
    };

const STEALTH_PLUGINS = [];

for ( const plugin of stealthPlugin().dependencies ) {
    if ( DISABLED_STEALTH_PLUGINS.has( plugin.replace( "stealth/evasions/", "" ) ) ) continue;

    const { "default": Plugin } = await import( "puppeteer-extra-plugin-" + plugin + "/index.js" );

    STEALTH_PLUGINS.push( Plugin );
}

const { "default": browser } = await import( new URL( "lib/client/browser.js", import.meta.resolve( "playwright-core" ) ) );

browser.Browser = class extends browser.Browser {

    // public
    async newContext ( { stealth = true, ...options } = {} ) {

        // make a copy
        options = { ...options };

        // "viewport" can't be null if "deviceScaleFactor" is specified
        if ( options.deviceScaleFactor && options.viewport === null ) delete options.viewport;

        // patch proxy
        if ( typeof options.proxy === "string" ) {
            options.proxy = await ProxyClient.new( options.proxy ).getPlaywrightProxy();
        }
        else if ( options.proxy instanceof ProxyClient ) {
            options.proxy = await options.proxy.getPlaywrightProxy();
        }

        if ( stealth || ctx.browser().isHeadless || options.userAgent ) {
            stealth = {
                "userAgent": null,
                "userAgentVersion": null,
            };

            if ( options.userAgent ) {
                stealth.userAgent = options.userAgent;
            }
            else {
                if ( !this.userAgent ) {
                    const session = await this.newBrowserCDPSession(),
                        browserVersion = await session.send( "Browser.getVersion" );

                    await session.detach();

                    this.userAgent = browserVersion.userAgent;
                    this.userAgentVersion = browserVersion.jsVersion;

                    // remove "Headless" prefix
                    this.userAgent = this.userAgent.replaceAll( "Headless", "" );
                }

                stealth.userAgent = this.userAgent;
                stealth.userAgentVersion = this.userAgentVersion;
            }

            // parse user agent
            stealth.userAgent = new UserAgent( stealth.userAgent );

            options.userAgent = stealth.userAgent.userAgent;

            options.locale ||= "en-US,en";
        }

        const ctx = await super.newContext( options );

        if ( stealth ) {
            ctx.stealth = stealth;

            await this.#applyStealth( ctx );
        }

        return ctx;
    }

    async newPage ( options ) {
        const page = await super.newPage( options );

        await this.#patchUserAgent( page, options );

        return page;
    }

    // private
    async #applyStealth ( ctx ) {
        const options = {

            // navigator.hardwareConcurrency
            "hardwareConcurrency": 4,

            // navigator.languages
            // "languages": [ "en-US", "en" ],

            // navigator.vendor
            // "vendor": "Google Inc.",

            // webgl.vendor
            "vendor": ( WEBGL[ ctx.stealth?.userAgent.paltform ] || WEBGL.default ).vendor,
            "renderer": ( WEBGL[ ctx.stealth?.userAgent.paltform ] || WEBGL.default ).renderer,
        };

        // init stealth plugins
        const plugins = [];

        for ( const plugin of STEALTH_PLUGINS ) {
            plugins.push( plugin( options ) );
        }

        const shim = {
            async evaluateOnNewDocument ( pageFunction, ...args ) {
                await ctx.addInitScript( pageFunction, args[ 0 ] );
            },
        };

        for ( const plugin of plugins ) {
            await plugin.onPageCreated( shim );
        }
    }

    // XXX
    async #patchUserAgent ( page, options ) {
        var userAgent;

        if ( options.userAgent ) {
            userAgent = new UserAgent( options.userAgent );
        }
        else {
            userAgent = page.context().stealth?.userAgent;
        }

        if ( !userAgent ) return;

        const override = {
            "userAgent": userAgent,
            "platform": "Linux",
            "userAgentMetadata": {
                "brands": [

                    //
                    { "brand": "A", "version": "1" },
                    { "brand": "B", "version": "2" },
                    { "brand": "C", "version": "3" },
                ],
                "fullVersion": "1.2.3.4",
                "platform": "Linux",
                "platformVersion": "",
                "architecture": "x86",
                "model": "Model",
                "mobile": false,
            },
        };

        // In case of headless, override the acceptLanguage in CDP.
        // This is not preferred, as it messed up the header order.
        // On headful, we set the user preference language setting instead.
        // if ( this._headless ) {
        // override.acceptLanguage = this.opts.locale || "en-US,en";
        // }

        const session = await page.context().newCDPSession( page );

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );
    }
};
