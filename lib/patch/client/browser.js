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
    PLATFORMS = {
        "android": {
            "short": "Android",
            "long": "Android",
        },
        "ios": {
            "short": "iOS",
            "long": "iOS",
        },
        "linux": {
            "short": "Linux",
            "long": "Linux",
        },
        "mac os x": {
            "short": "MacIntel",
            "long": "macOS",
        },
        "windows": {
            "short": "Win32",
            "long": "Windows",
        },
    },
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

        stealth = Boolean( stealth && ( this.isHeadless || options.userAgent ) );

        if ( stealth ) {
            stealth = {
                "userAgent": null,
                "userAgentVersion": null,
                "isMobile": Boolean( options.isMobile ),
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
                    if ( this.isHeadless ) {
                        this.userAgent = this.userAgent.replaceAll( "Headless", "" );
                    }
                }

                stealth.userAgent = this.userAgent;
                stealth.userAgentVersion = this.userAgentVersion;
            }

            // parse user agent
            stealth.userAgent = new UserAgent( stealth.userAgent );

            options.userAgent = stealth.userAgent.userAgent;
            options.locale ||= "en-US,en";
        }

        // create context
        const ctx = await super.newContext( options );

        // apply steatth mode
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
        var userAgent, userAgentVersion, isMobile;

        if ( options.userAgent ) {
            userAgent = new UserAgent( options.userAgent );
        }
        else if ( page.context().stealth ) {
            userAgent = page.context().stealth.userAgent;
            userAgentVersion = page.context().stealth.userAgentVersion;
            isMobile = page.context().stealth.isMobile;
        }

        isMobile = Boolean( options.isMobile ?? isMobile );

        if ( !userAgent ) return;

        console.log( userAgent.toJSON() );

        const override = {
            "userAgent": userAgent.userAgent,
            "platform": PLATFORMS[ userAgent.os.family?.toLowerCase() ]?.short || "",
            "acceptLanguage": undefined,
            "userAgentMetadata": {
                "brands": [

                    // XXX
                    { "brand": "A", "version": "1" },
                    { "brand": "B", "version": "2" },
                    { "brand": "C", "version": "3" },
                ],
                "fullVersion": userAgentVersion || userAgent.browser.version,
                "platform": PLATFORMS[ userAgent.os.family?.toLowerCase() ]?.long || "Unknown",
                "platformVersion": userAgent.os.version || "",
                "architecture": isMobile
                    ? ""
                    : "x86",
                "model": userAgent.device.model || "",
                "mobile": isMobile,
            },
        };

        console.log( override );

        const session = await page.context().newCDPSession( page );

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );
    }
};
