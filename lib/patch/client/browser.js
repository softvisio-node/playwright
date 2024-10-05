import browser from "playwright-core/lib/client/browser.js";
import ProxyClient from "#core/proxy";

const STEALTH = {
    "webgl.vendor": ( await import( "#lib/stealth/webgl.vendor/index" ) ).default,
    "navigator.webdriver": ( await import( "#lib/stealth/navigator.webdriver/index" ) ).default,
    "navigator.plugins": ( await import( "#lib/stealth/navigator.plugins/index" ) ).default,
    "chrome.runtime": ( await import( "#lib/stealth/chrome.runtime/index" ) ).default,

    // "navigator.permissions": ( await import( "#lib/stealth/navigator.permissions/index" ) ).default,
    // "navigator.vendor": ( await import( "#lib/stealth/navigator.vendor/index" ) ).default,
};

browser.Browser = class extends browser.Browser {

    // public
    async newContext ( options = {} ) {

        // make a copy
        options = { ...options };

        // apply device settings
        if ( options.device ) {
            options = { ...options.device, ...options };

            delete options.device;
        }

        // "viewport" can't be null if "deviceScaleFactor" is specified
        if ( options.deviceScaleFactor && options.viewport === null ) delete options.viewport;

        // patch userAgent
        if ( !options.userAgent && this._initializer.userAgent ) {
            options.userAgent = this._initializer.userAgent.replace( "HeadlessChrome/", "Chrome/" );

            // patch userAgent platform
            if ( options.userAgentPlatform ) {
                options.userAgent = options.userAgent.replace( /\(.+?\)/, `(${ options.userAgentPlatform })` );
            }
        }

        // patch proxy
        if ( typeof options.proxy === "string" ) {
            options.proxy = await ProxyClient.new( options.proxy ).getPlaywrightProxy();
        }
        else if ( options.proxy instanceof ProxyClient ) {
            options.proxy = await options.proxy.getPlaywrightProxy();
        }

        const ctx = await super.newContext( options );

        // override navigator.platform
        if ( options.platform ) {
            await ctx.addInitScript(
                ( [ platform ] ) => {
                    Object.defineProperty( navigator, "platform", {
                        "get": function () {
                            return platform;
                        },
                        "set": function ( value ) {},
                    } );
                },
                [ options.platform ]
            );
        }

        // apply stealth plugins
        if ( options.stealth !== false ) {
            for ( const plugin of Object.values( STEALTH ) ) {
                await ctx.addInitScript( ...plugin.onPageCreated( options ) );
            }
        }

        return ctx;
    }
};
