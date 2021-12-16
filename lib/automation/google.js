import playwright from "@softvisio/playwright";
import ProxyClient from "#core/proxy";
import randomLocation from "random-location";
import { objectIsPlain } from "#core/utils";
import BrowseSite from "#lib/automation/browse-site";
import Api from "#core/api";

const browseSite = new BrowseSite();

export default class Google {
    #browser;
    #proxy;
    #datasets;
    #maxRetries;

    constructor ( { browser, proxy, datasets, maxRetries = 10 } = {} ) {
        this.#browser = browser;
        this.#proxy = ProxyClient.new( proxy );
        this.#datasets = typeof datasets === "string" ? Api.new( datasets ).unref() : datasets;
        this.#maxRetries = maxRetries;
    }

    // static
    static async new ( { browser, proxy, datasets, maxRetries = 10 } = {} ) {
        if ( !browser || objectIsPlain( browser ) ) {
            browser = await playwright.chromium.launch( browser );
        }
        else if ( typeof browser === "string" ) {
            browser = playwright.chromium.connect( browser );
        }

        return new this( { browser, proxy, datasets, maxRetries } );
    }

    // public
    async search ( { keyword, target, maxResults = 100, location, minDistance, maxDistance, proxy, language, device, emulateUser } ) {
        if ( proxy ) proxy = ProxyClient.new( proxy );

        var res, page;

        for ( let n = 0; n < this.#maxRetries; n++ ) {
            this.#cleanup( page );

            // open page
            try {
                page = await this.#createPage( { location, minDistance, maxDistance, device, proxy } );
            }
            catch ( e ) {
                res = result.catch( e );

                break;
            }

            try {

                // open gmb
                res = result.try( await this.#open( { page, language, emulateUser } ), { "allowUndefined": true } );
                if ( !res.ok ) break;

                // search keyword
                res = result.try( await this.#search( { page, keyword, emulateUser } ), { "allowUndefined": true } );

                break;
            }
            catch ( e ) {
                res = result.catch( e );

                // repeat on error
                continue;
            }
        }

        // gmb opened
        if ( res.ok ) {
            try {

                // get results
                res = result.try( await this._getResults( { page, maxResults, target, emulateUser } ) );
            }
            catch ( e ) {
                res = result.catch( e );
            }
        }

        this.#cleanup( page );

        return res;
    }

    // protested
    async _onTargetFound ( page, el ) {}

    async _browseTargetSite ( page, { pagesToVisitMin = 10, pagesToVisitMax = 10, pageVisitTimeoutMin = 10000, pageVisitTimeoutMax = 10000 } = {} ) {
        return browseSite.run( page, { pagesToVisitMin, pagesToVisitMax, pageVisitTimeoutMin, pageVisitTimeoutMax } );
    }

    // private
    async #createPage ( { location, minDistance, maxDistance, proxy, device } ) {
        var coordinates;

        if ( typeof location === "string" ) {
            const geolocation = await this.#datasets.call( "geotargets/get-geotarget", location, { "random_coordinates": true } );

            if ( !geolocation.data?.random_coordinates ) throw result( [500, `Unable to get random coordinates for location`] );

            coordinates = geolocation.data.random_coordinates;
        }
        else {
            if ( maxDistance ) {
                coordinates = randomLocation.randomAnnulusPoint( location, minDistance || 0, maxDistance );
            }
            else {
                coordinates = location;
            }
        }

        const options = {
            device,
            "viewport": null,
            "permissions": ["geolocation"],
            "geolocation": {
                "accuracy": 100,
                ...coordinates,
            },
        };

        // proxy
        proxy ||= this.#proxy;

        if ( proxy ) options.proxy = await proxy.getPlaywrightProxy();

        // create context
        const ctx = await this.#browser.newContext( options );

        // create page
        return ctx.newPage();
    }

    async #open ( { page, language, emulateUser } ) {
        var url = this._url;

        if ( language ) url += "&hl=" + language;

        var res;

        try {
            res = await page.goto( url );
            res = result( res.status() );

            if ( !emulateUser ) await page.disableImages();
        }
        catch ( e ) {
            res = result.catch( e );
        }

        if ( !res.ok ) throw res;
    }

    async #search ( { page, keyword, emulateUser } ) {

        // find query field
        const el = await page.$( `input[name="q"]` );

        if ( !el ) throw result( [500, `Query input element not found`] );

        await el.type( keyword + "\n", { "delay": emulateUser ? 50 + Math.floor( Math.random() * 150 ) : undefined } );

        await page.waitForNavigation();
    }

    #cleanup ( page ) {
        if ( !page ) return;

        page.context().close();
    }
}
