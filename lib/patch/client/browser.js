import { createPageShim } from "playwright-extra/dist/puppeteer-compatiblity-shim/index.js";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import ProxyClient from "#core/net/proxy";

const { "default": browser } = await import( new URL( "lib/client/browser.js", import.meta.resolve( "playwright-core" ) ) );

browser.Browser = class extends browser.Browser {

    // public
    async newContext ( { device, ...options } = {} ) {

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

        const stealth = stealthPlugin( {} );

        // init stealth plugin
        const evasions = [];
        for ( const dependency of stealth.dependencies ) {
            const { "default": plugin } = await import( "puppeteer-extra-plugin-" + dependency + "/index.js" );

            evasions.push( plugin() );
        }

        const ctx = await super.newContext( options );

        ctx.on( "page", async page => {
            page = createPageShim( page );

            for ( const evasion of evasions ) {
                await evasion.onPageCreated( page );
            }
        } );

        return ctx;
    }
};
