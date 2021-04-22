const Proxy = require( "@softvisio/core/proxy" );

const STEALTH = {
    "webgl.vendor": require( "../../stealth/webgl.vendor" ),
    "navigator.webdriver": require( "../../stealth/navigator.webdriver" ),
    "navigator.plugins": require( "../../stealth/navigator.plugins" ),
    "chrome.runtime": require( "../../stealth/chrome.runtime" ),

    // "navigator.permissions": require( "../../stealth/navigator.permissions" ),
    // "navigator.vendor": require( "../../stealth/navigator.vendor" ),
};

const chromiumBrowser = require( "playwright-core/lib/client/chromiumBrowser" );

chromiumBrowser.ChromiumBrowser = class extends chromiumBrowser.ChromiumBrowser {
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
                options.userAgent = options.userAgent.replace( /\(.+?\)/, `(${options.userAgentPlatform})` );
            }
        }

        // patch proxy
        if ( typeof options.proxy === "string" ) {
            options.proxy = await Proxy.new( options.proxy ).getPlaywrightProxy();
        }
        else if ( options.proxy instanceof Proxy ) {
            options.proxy = await options.proxy.getPlaywrightProxy();
        }

        const ctx = await super.newContext( options );

        // override navigator.platform
        if ( options.platform ) {
            await ctx.addInitScript( ( [platform] ) => {
                Object.defineProperty( navigator, "platform", {
                    "get": function () {
                        return platform;
                    },
                    "set": function ( value ) {},
                } );
            },
            [options.platform] );
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
