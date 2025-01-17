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
            "navigator": "Android",
            "sec-ch-ua-platform": "Android",
        },
        "ios": {
            "navigator": "iOS",
            "sec-ch-ua-platform": "iOS",
        },
        "linux": {
            "navigator": "Linux",
            "sec-ch-ua-platform": "Linux",
        },
        "mac os x": {
            "navigator": "MacIntel",
            "sec-ch-ua-platform": "macOS",
        },
        "windows": {
            "navigator": "Win32",
            "sec-ch-ua-platform": "Windows",
        },
    },
    WEBGL = {
        "default": {
            "vendor": "Intel Inc.",
            "renderer": "Intel Iris OpenGL Engine",
        },
        "ios": {
            "vendor": "Apple Inc.",
            "renderer": "Apple GPU",
        },
    },
    FAMILY_BRANDS = {
        "chrome": "Google Chrome",
        "edge": "Microsoft Edge",
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
            "vendor": ( WEBGL[ ctx.stealth?.userAgent.os.family?.toLowerCase() ] || WEBGL.default ).vendor,
            "renderer": ( WEBGL[ ctx.stealth?.userAgent.os.family?.toLowerCase() ] || WEBGL.default ).renderer,
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
                "userAgent": new UserAgent( options.userAgent ),
            };
        }
        else if ( page.context().stealth ) {
            stealth = page.context().stealth;
        }

        // patch is not required
        if ( !stealth ) return;

        const isMobile = Boolean( options.isMobile ?? stealth.isMobile );

        console.log( stealth.userAgent.toJSON() );

        const override = {
            "userAgent": stealth.userAgent.userAgent,
            "platform": PLATFORMS[ stealth.userAgent.os.family?.toLowerCase() ]?.navigator || "",
            "acceptLanguage": undefined,
            "userAgentMetadata": {
                "brands": this.#createUserAgentBrands( stealth.userAgent.browser.family, stealth.userAgentVersion || stealth.userAgent.browser.version, false ),
                "fullVersionList": this.#createUserAgentBrands( stealth.userAgent.browser.family, stealth.userAgentVersion || stealth.userAgent.browser.version, true ),
                "platform": PLATFORMS[ stealth.userAgent.os.family?.toLowerCase() ]?.[ "sec-ch-ua-platform" ] || "Unknown",
                "platformVersion": stealth.userAgent.os.version || "",
                "architecture": isMobile // XXX
                    ? ""
                    : "x86",
                "model": stealth.userAgent.device.model || "",
                "mobile": isMobile,
            },
        };

        console.log( JSON.stringify( override, null, 4 ) );

        const session = await page.context().newCDPSession( page );

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );
    }

    #createUserAgentBrands ( family, userAgentVersion, full ) {
        const brand = FAMILY_BRANDS[ family?.toLowerCase() ];

        if ( !brand ) return [];

        // https://source.chromium.org/chromium/chromium/src/+/master:components/embedder_support/user_agent_utils.cc;l=55-100

        const seed = userAgentVersion.split( "." )[ 0 ],
            version = full
                ? userAgentVersion
                : seed,
            order = [
                [ 0, 1, 2 ],
                [ 0, 2, 1 ],
                [ 1, 0, 2 ],
                [ 1, 2, 0 ],
                [ 2, 0, 1 ],
                [ 2, 1, 0 ],
            ][ seed % 6 ],
            escapedChars = [ " ", " ", ";" ],
            greaseyBrand = `${ escapedChars[ order[ 0 ] ] }Not${ escapedChars[ order[ 1 ] ] }A${ escapedChars[ order[ 2 ] ] }Brand`,
            greasedBrandVersionList = [];

        greasedBrandVersionList[ order[ 0 ] ] = {
            "brand": greaseyBrand,
            "version": "99",
        };

        greasedBrandVersionList[ order[ 1 ] ] = {
            "brand": "Chromium",
            version,
        };

        greasedBrandVersionList[ order[ 2 ] ] = {
            brand,
            version,
        };

        return greasedBrandVersionList;
    }
};
