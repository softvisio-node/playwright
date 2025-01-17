import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";
import UserAgent from "#core/user-agent";

// init stealth plugin
const PLUGINS = [],
    disabledPlugins = new Set( [

        //
        "navigator.vendor",
        "user-agent-override",
    ] );

for ( const dependency of stealthPlugin().dependencies ) {
    if ( disabledPlugins.has( dependency.replace( "stealth/evasions/", "" ) ) ) continue;

    const { "default": plugin } = await import( "puppeteer-extra-plugin-" + dependency + "/index.js" );

    PLUGINS.push( plugin );
}

const WEBGL = {
    "default": {
        "vendor": "Intel Inc.",
        "renderer": "Intel Iris OpenGL Engine",
    },
    "iphone": {
        "vendor": "Apple Inc.",
        "renderer": "Apple GPU",
    },
};

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

        const ctx = await super.newContext( options );

        if ( stealth || ctx.browser().isHeadless || options.userAgent ) {
            const stealthData = {
                "userAgent": null,
                "userAgentVersion": null,
            };

            if ( options.userAgent ) {
                stealthData.userAgent = options.userAgent;
            }
            else {
                if ( !this.userAgent ) {
                    const session = await this.newBrowserCDPSession(),
                        browserVersion = await stealthData.session.send( "Browser.getVersion" );

                    await session.detach();

                    this.userAgent = browserVersion.userAgent;
                    this.userAgentVersion = browserVersion.jsVersion;

                    // remove "Headless" prefix
                    this.userAgent = this.userAgent.replaceAll( "Headless", "" );
                }

                stealthData.userAgent = this.userAgent;
                stealthData.userAgentVersion = this.userAgentVersion;
            }

            stealthData.userAgent = new UserAgent( stealthData.userAgent );

            ctx.stealth = stealthData;

            options.userAgent = ctx.stealth.userAgent.userAgent;

            await this.#applyStealth( ctx, options );
        }

        return ctx;
    }

    // XXX
    async newPage ( options ) {
        const page = await super.newPage( options );

        await this.#patchUserAgent( page, options );

        return page;
    }

    // private
    // XXX - languages
    async #applyStealth ( ctx, options ) {
        const settings = {

            // navigator.hardwareConcurrency
            "hardwareConcurrency": 4,

            // navigator.languages
            "languages": [ "en-US", "en" ],

            // navigator.vendor
            // "vendor": "Google Inc.",

            // webgl.vendor
            "vendor": ( WEBGL[ ctx.stealth?.userAgent.paltform ] || WEBGL.default ).vendor,
            "renderer": ( WEBGL[ ctx.stealth?.userAgent.paltform ] || WEBGL.default ).renderer,
        };

        // init stealth plugins
        const evasions = [];

        for ( const plugin of PLUGINS ) {
            evasions.push( plugin( settings ) );
        }

        const shim = {
            async evaluateOnNewDocument ( pageFunction, ...args ) {
                await ctx.addInitScript( pageFunction, args[ 0 ] );
            },
        };

        for ( const evasion of evasions ) {
            await evasion.onPageCreated( shim );
        }
    }

    // XXX
    async #patchUserAgent ( page, options ) {
        const session = await page.context().newCDPSession( page ),
            data = await session.send( "Browser.getVersion" );

        // XXX jsVersion
        const userAgent = data.userAgent.replaceAll( "Headless", "" );

        // const userAgent = options.userAgent;

        console.log( new UserAgent( userAgent ).toJSON() );
        process.exit();

        // patch userAgent
        // if ( !options.userAgent && userAgent ) {
        //     options.userAgent = userAgent.replace( "HeadlessChrome/", "Chrome/" );

        //     // patch userAgent platform
        //     if ( options.userAgentPlatform ) {
        //         options.userAgent = options.userAgent.replace( /\(.+?\)/, `(${ options.userAgentPlatform })` );
        //     }
        // }

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

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );
    }
};
