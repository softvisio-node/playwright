import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";
import UserAgent from "#core/user-agent";

// init stealth plugin
const DISABLED_STEALTH_PLUGINS = new Set( [

    // covered by context "locales" option
    "navigator.languages",

    "navigator.vendor",
    "user-agent-override",
] );

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

        // clone options
        options = structuredClone( options );

        // "viewport" can't be null if "deviceScaleFactor" is specified
        if ( options.deviceScaleFactor && options.viewport === null ) delete options.viewport;

        // patch proxy
        if ( typeof options.proxy === "string" ) {
            options.proxy = await ProxyClient.new( options.proxy ).getPlaywrightProxy();
        }
        else if ( options.proxy instanceof ProxyClient ) {
            options.proxy = await options.proxy.getPlaywrightProxy();
        }

        // patch user agent
        if ( stealth && ( this.isHeadless || options.userAgent ) ) {
            var stealthUserAgent = {
                "userAgent": null,
                "isMobile": Boolean( options.isMobile ),
            };

            if ( options.userAgent ) {
                stealthUserAgent.userAgent = options.userAgent;
            }
            else {
                if ( !this.userAgent ) {
                    const session = await this.newBrowserCDPSession(),
                        browserVersion = await session.send( "Browser.getVersion" );

                    await session.detach();

                    this.userAgent = browserVersion.userAgent;

                    // remove "Headless" prefix
                    if ( this.isHeadless ) {
                        this.userAgent = this.userAgent.replaceAll( "Headless", "" );
                    }
                }

                stealthUserAgent.userAgent = this.userAgent;
            }

            // parse user agent
            stealthUserAgent.userAgent = UserAgent.new( stealthUserAgent.userAgent );

            options.userAgent = stealthUserAgent.userAgent.reducedUserAgent;
            options.locale ||= "en-US,en";
        }

        // create context
        const ctx = await super.newContext( options );

        if ( stealthUserAgent ) ctx.stealth = stealthUserAgent;

        // apply steatth mode
        if ( stealth ) await this.#applyStealth( ctx );

        return ctx;
    }

    async newPage ( options ) {
        const page = await super.newPage( options );

        await this.#patchUserAgent( page, options );

        return page;
    }

    // private
    async #applyStealth ( ctx ) {
        const webgl = ctx.stealth?.userAgent.webgl,
            options = {

                // navigator.hardwareConcurrency
                "hardwareConcurrency": 4,

                // navigator.languages
                // "languages": [ "en-US", "en" ],

                // navigator.vendor
                // "vendor": "Google Inc.",

                // webgl.vendor
                "vendor": webgl?.vendor,
                "renderer": webgl?.renderer,
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

    async #patchUserAgent ( page, options ) {
        var stealth;

        if ( options.userAgent ) {
            stealth = {
                "userAgent": UserAgent.new( options.userAgent ),
            };
        }
        else if ( page.context().stealth ) {
            stealth = page.context().stealth;
        }

        // patch is not required
        if ( !stealth ) return;

        const isMobile = Boolean( options.isMobile ?? stealth.isMobile );

        const override = {
            "userAgent": stealth.userAgent.reducedUserAgent,
            "platform": stealth.userAgent.platform?.navigator || "",
            "acceptLanguage": undefined,
            "userAgentMetadata": {
                "brands": stealth.userAgent.createChromiumBrands() || [],
                "fullVersionList": stealth.userAgent.createChromiumBrands( true ) || [],
                "platform": stealth.userAgent.platform?.[ "sec-ch-ua-platform" ] || "Unknown",
                "platformVersion": stealth.userAgent.os.version || "",
                "architecture": isMobile // XXX
                    ? ""
                    : "x86",
                "model": stealth.userAgent.device.model || "",
                "mobile": isMobile,
            },
        };

        const session = await page.context().newCDPSession( page );

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );
    }
};
