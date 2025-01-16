import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";

// init stealth plugin
const PLUGINS = [];

for ( const dependency of stealthPlugin().dependencies ) {
    if ( dependency === "stealth/evasions/user-agent-override" ) continue;

    const { "default": plugin } = await import( "puppeteer-extra-plugin-" + dependency + "/index.js" );

    PLUGINS.push( plugin );
}

const { "default": browser } = await import( new URL( "lib/client/browser.js", import.meta.resolve( "playwright-core" ) ) );

browser.Browser = class extends browser.Browser {

    // public
    // XXX
    async newContext ( { stealth = true, device, ...options } = {} ) {

        // make a copy
        options = { ...options };

        // apply device settings
        if ( device ) {
            options = { ...device, ...options };
        }

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

        // XXX
        if ( stealth ) {
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
    // XXX - webgl settings
    async #applyStealth ( ctx, options ) {

        // init stealth plugin
        const evasions = [];

        for ( const plugin of PLUGINS ) {
            evasions.push( plugin() );
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

        const userAgent = data.userAgent;

        const override = {
            "userAgent": userAgent,

            // "platform": _getPlatform(),
            // "userAgentMetadata": {
            //     "brands": _getBrands(),
            //     "fullVersion": uaVersion,
            //     "platform": _getPlatform( true ),
            //     "platformVersion": _getPlatformVersion(),
            //     "architecture": _getPlatformArch(),
            //     "model": _getPlatformModel(),
            //     "mobile": _getMobile(),
            // },
        };

        // In case of headless, override the acceptLanguage in CDP.
        // This is not preferred, as it messed up the header order.
        // On headful, we set the user preference language setting instead.
        // if ( this._headless ) {
        // override.acceptLanguage = this.opts.locale || "en-US,en";
        // }

        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-setUserAgentOverride
        await session.send( "Network.setUserAgentOverride", override );

        await session.detach();
    }
};
