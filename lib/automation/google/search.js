import Google from "#lib/automation/google";
import ProxyClient from "#core/proxy";
import randomLocation from "random-location";
import { sleep } from "#core/utils";

const BASE_URL = "https://www.google.com/search?npsic=0&rflfq=1&rldoc=1&tbm=lcl&sa=X";

export default class GoogleSearch extends Google {
    #browser;
    #proxy;
    #datasets;
    #maxRetries;

    // protected
    async _search ( { keyword, businessName, maxResults = 100, location, minDistance, maxDistance, proxy, language, emulateUser } ) {
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
                res = result.try( await this.#openGmb( { page, language, emulateUser } ), { "allowUndefined": true } );
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
                res = result.try( await this.#getResults( { page, maxResults, businessName, emulateUser } ) );
            }
            catch ( e ) {
                res = result.catch( e );
            }
        }

        this.#cleanup( page );

        return res;
    }

    async _onTargetFound ( page, el ) {
        var res;

        try {
            await Promise.all( [

                //

                el.click(),
                page.waitForSelector( "div.immersive-container" ),
            ] );

            await sleep( 3000 );

            const card = await page.$( "div.immersive-container" );

            // browse reviews
            const reviews = await card.$$( "g-review-stars" );

            for ( const review of reviews ) {
                try {

                    // await review.scrollIntoViewIfNeeded();
                    await review.hover( { "trial1": true, "timeout1": 1 } );

                    await sleep( 1000 );
                }
                catch ( e ) {}

                // await sleep( 3000 );
            }

            // open and browser target site
            const websiteButton = await card.$( `a.RFlwHf` );
            if ( websiteButton ) {
                await new Promise( resolve => {
                    page.context().once( "page", async page => {
                        await this._browseTargetSite( page );

                        resolve();
                    } );

                    websiteButton.click( { "modifiers": ["Control"] } );
                } );
            }

            // click to phone
            const callButton = await card.$( `a[jscontroller="LWZElb"]` );
            if ( callButton ) {
                await callButton.click();
                await sleep( 500 );
            }
        }
        catch ( e ) {
            res = result.catch( e );
        }

        return res;
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

    async #openGmb ( { page, language, emulateUser } ) {
        var url = BASE_URL;

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

        var [res] = await Promise.all( [

            //
            page.waitForNavigation(),
            el.type( keyword + "\n", { "delay": emulateUser ? 50 + Math.floor( Math.random() * 150 ) : undefined } ),
        ] );

        res = result( res.status() );

        if ( !res.ok ) throw res;
    }

    async #getResults ( { page, maxResults, businessName, emulateUser } ) {
        const results = [];

        var position = 0;

        if ( businessName ) businessName = businessName.toLowerCase();

        // detect empty results
        if ( await page.$( "div.section-bad-query-title" ) ) return result( 200 );

        COLLECT_RESULTS: while ( 1 ) {

            // find results elements
            const els = await page.$$( "div.VkpGBb" );

            // no results elements found, this is selectors error
            if ( !els.length ) return result( [500, "Search results selector not found"] );

            for ( const el of els ) {
                if ( emulateUser ) {
                    await el.hover();

                    await sleep( 10 + Math.floor( Math.random() * 1000 ) );
                }

                // skip ads
                if ( await el.$( "span.gghBu" ) ) continue;

                // find business name
                const resultBusinessName = await this._getTextContent( el, `div[role="heading"]` );

                // unable to find business name
                if ( !resultBusinessName ) return result( [500, "Business name selector not found"] );

                // find clickToWebsite element
                let urlEl, url;

                // get target site url
                if ( ( urlEl = await el.$( `a.yYlJEf.L48Cpd` ) ) ) {
                    url = await urlEl.evaluate( el => el._getAttribute( "href" ) );
                }

                const item = {
                    "name": resultBusinessName,
                    "position": ++position,
                    url,
                };

                results.push( item );

                if ( businessName === item.name.toLowerCase() ) {
                    await this._onTargetFound( page, el );

                    return result( 200, item );
                }

                if ( position >= maxResults ) break COLLECT_RESULTS;
            }

            // no next page available
            if ( !( await this.#gotoNextPage( page ) ) ) break COLLECT_RESULTS;
        }

        if ( businessName ) return result( 200 );
        else return result( 200, results );
    }

    async #gotoNextPage ( page ) {

        // find next page button
        const next = await page.$( "#pnnext" );

        // next page button not found
        if ( !next ) false;

        // hide elements
        await page.evaluate( () => {
            const els = document.querySelectorAll( "div.VkpGBb" );

            for ( const el of els ) el.remove();
        } );

        // click next button
        await next.click();

        // wait until new elements will be rendered
        await page.waitForSelector( "div.VkpGBb", { "state": "visible" } );

        // await page.waitForSelector( "div.rlfl__loading-overlay", { "state": "visible" } );

        // await page.waitForSelector( "div.rlfl__loading-overlay", { "state": "hidden" } );

        await page.waitForNavigation();

        return true;
    }
}
