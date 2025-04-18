import ProxyClient from "#core/net/proxy";
import UserAgent from "#core/user-agent";

const STEALTH = {
    "webgl.vendor": ( await import( "#lib/stealth/webgl.vendor/index" ) ).default,
    "navigator.webdriver": ( await import( "#lib/stealth/navigator.webdriver/index" ) ).default,
    "navigator.plugins": ( await import( "#lib/stealth/navigator.plugins/index" ) ).default,
    "chrome.runtime": ( await import( "#lib/stealth/chrome.runtime/index" ) ).default,

    // "navigator.permissions": ( await import( "#lib/stealth/navigator.permissions/index" ) ).default,
    // "navigator.vendor": ( await import( "#lib/stealth/navigator.vendor/index" ) ).default,
};

const { "default": browser } = await import( new URL( "lib/client/browser.js", import.meta.resolve( "playwright-core" ) ) );

Object.defineProperties( browser.Browser.prototype, {

    // super
    "__newPage": {
        "value": browser.Browser.prototype.newPage,
    },

    "__newContext": {
        "value": browser.Browser.prototype.newContext,
    },

    // public
    "newContext": {
        async value ( { stealth = true, ...options } = {} ) {

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
            const ctx = await this.__newContext( options );

            if ( stealthUserAgent ) ctx.stealth = stealthUserAgent;

            // apply steatth mode
            if ( stealth ) await this._applyStealth( ctx );

            return ctx;
        },
    },

    "newPage": {
        async value ( options ) {
            const page = await this.__newPage( options );

            await this._patchUserAgent( page, options );

            return page;
        },
    },

    // protected
    "_applyStealth": {
        async value ( ctx ) {
            const webgl = ctx.stealth?.userAgent.webgl,
                options = {

                    // webgl.vendor
                    "webglVendor": webgl?.vendor,
                    "webglRenderer": webgl?.renderer,
                };

            for ( const plugin of Object.values( STEALTH ) ) {
                await ctx.addInitScript( ...plugin.onPageCreated( options ) );
            }
        },
    },

    "_patchUserAgent": {
        async value ( page, options ) {
            var stealth;

            if ( options?.userAgent ) {
                stealth = {
                    "userAgent": UserAgent.new( options.userAgent ),
                };
            }
            else if ( page.context().stealth ) {
                stealth = page.context().stealth;
            }

            // patch is not required
            if ( !stealth ) return;

            const isMobile = Boolean( options?.isMobile ?? stealth.isMobile );

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
        },
    },
} );
