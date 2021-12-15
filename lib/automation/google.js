import playwright from "@softvisio/playwright";
import ProxyClient from "#core/proxy";
import randomLocation from "random-location";
import { objectIsPlain } from "#core/utils";
import BrowseSite from "#lib/automation/browse-site";

const browseSite = new BrowseSite();

export default class Google {
    #browser;
    #proxy;
    #datasets;
    #maxRetries;

    constructor ( { browser, proxy, datasets, maxRetries = 10 } = {} ) {
        this.#browser = browser;
        this.#proxy = ProxyClient.new( proxy );
        this.#datasets = datasets;
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
    async search ( { keyword, target, maxResults = 100, location, minDistance, maxDistance, proxy, language, emulateUser } ) {
        if ( proxy ) proxy = ProxyClient.new( proxy );

        var res, page;

        for ( let n = 0; n < this.#maxRetries; n++ ) {
            this.#cleanup( page );

            // open page
            try {
                page = await this.#createPage( { location, minDistance, maxDistance, proxy } );
            }
            catch ( e ) {
                res = result.catch( e );

                break;
            }

            try {

                // open gmb
                res = result.try( await this._open( { page, language, emulateUser } ), { "allowUndefined": true } );
                if ( !res.ok ) break;

                // search keyword
                res = result.try( await this._search( { page, keyword, emulateUser } ), { "allowUndefined": true } );

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

    async _browseTargetSite ( page ) {
        return browseSite.run( page );
    }

    // private
    async #createPage ( { location, minDistance, maxDistance, proxy } ) {
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

    #cleanup ( page ) {
        if ( !page ) return;

        page.context().close();
    }
}
