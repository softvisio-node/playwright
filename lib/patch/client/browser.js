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

        // ctx.addInitScript();
        // ctx.on( "page", async page => {

        // } );

        return ctx;
    }

    // XXX
    async newPage1 ( options ) {
        const page = await super.newPage( options );

        await page.goto( "about:blank" );

        return page;
    }

    // private
    // XXX
    async #applyStealth ( ctx, options ) {

        // init stealth plugin
        const evasions = [];
        for ( const plugin of PLUGINS ) {
            evasions.push( plugin() );
        }

        // page = createPageShim( page );
        const shim = {

            // XXX
            evaluateOnNewDocument () {

                // return await ctx.addInitScript(pageFunction, args[0]);
            },
        };

        for ( const evasion of evasions ) {
            await evasion.onPageCreated( shim );
        }

        const session = await this.newBrowserCDPSession(),
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

        await session.send( "Network.setUserAgentOverride", override );
    }
};
