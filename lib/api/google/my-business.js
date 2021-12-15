import ProxyClient from "#core/proxy";
import randomLocation from "random-location";
import { sleep } from "#core/utils";

const BASE_URL = "https://www.google.com/search?npsic=0&rflfq=1&rldoc=1&tbm=lcl&sa=X";

export default class GoogleMyBusiness {
    #browser;
    #proxy;
    #datasets;
    #maxRetries;

    #page;

    constructor ( { browser, proxy, datasets, maxRetries = 10 } = {} ) {
        this.#browser = browser;
        this.#proxy = ProxyClient.new( proxy );
        this.#datasets = datasets;
        this.#maxRetries = maxRetries;
    }

    // public
    async search ( { keyword, businessName, maxResults = 100, location, minDistance, maxDistance, proxy, language, emulateUser } ) {
        if ( proxy ) proxy = ProxyClient.new( proxy );

        var res;

        try {

            // open gmb
            res = await this.#repeatAction( this.#openGmb.bind( this ), { location, minDistance, maxDistance, proxy, language } );
            if ( !res.ok ) throw res;

            // enter keyword
            res = await this.#repeatAction( this.#search.bind( this ), keyword );
            if ( !res.ok ) throw res;

            // get results
            res = await this.#repeatAction( this.#getResults.bind( this ), maxResults, businessName, emulateUser );
            if ( !res.ok ) throw res;
        }
        catch ( e ) {}

        // if ( this.#page ) this.#page.context().close();

        return res;
    }

    // protected
    async _onBusinessFound ( el ) {
        var res;

        try {
            await Promise.all( [

                //

                el.click(),
                this.#page.waitForSelector( "div.immersive-container" ),
            ] );

            await sleep( 3000 );

            const card = await this.#page.$( "div.immersive-container" );

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
            await new Promise( resolve => {
                this.#page.context().once( "page", async page => {
                    await this._visitBusinessSite( page );

                    resolve();
                } );

                card.$( `a.RFlwHf` ).then( el => el.click( { "modifiers": ["Control"] } ) );
            } );

            // click to phone
            const callButton = await card.$( `a[jscontroller="LWZElb"]` );
            await callButton.click();
        }
        catch ( e ) {
            res = result.catch( e );
        }

        return res;
    }

    async _visitBusinessSite ( page ) {

        // await sleep(this.#getPageVisitDuration(task));

        // const referer = page.url();

        // // get internal links
        // const urls = await page.evaluate(() => {
        //     const els = document.querySelectorAll("a"),
        //         urls = {},
        //         base = window.location.href,
        //         host = new URL(base).host;

        //     if (els) {
        //         for (const el of els) {
        //             const href = el.getAttribute("href");

        //             if (!href) continue;

        //             const url = new URL(href, base);

        //             if (host !== url.host) continue;

        //             // remove fragment
        //             url.hash = "";

        //             urls[url.toString()] = true;
        //         }
        //     }

        //     delete urls[base];

        //     return Object.keys(urls);
        // });

        // const pagesVisits = Math.floor(Math.random() * (task.pages_to_visit[1] - task.pages_to_visit[0] + 1) + task.pages_to_visit[0]);

        // for (let n = 0; n < pagesVisits; n++) {
        //     if (!urls.length) break;

        //     const idx = getRandomArrayIndex(urls),
        //         url = urls[idx];

        //     urls.splice(idx, 1);

        //     try {
        //         await page.goto(url, { referer });
        //     } catch (e) {}

        //     await sleep(this.#getPageVisitDuration(task));

        //     try {
        //         await page.goBack();
        //     } catch (e) {}
        // }

        return result( 200 );
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

    async #repeatAction ( method, ...args ) {
        var res;

        for ( let n = 0; n < this.#maxRetries; n++ ) {
            try {
                res = result.try( await method( ...args ), { "allowUndefined": true } );
            }
            catch ( e ) {
                res = result.catch( e );

                continue;
            }

            break;
        }

        return res;
    }

    async #openGmb ( { location, minDistance, maxDistance, proxy, language } ) {
        try {
            this.#page = await this.#createPage( { location, minDistance, maxDistance, proxy } );
        }
        catch ( e ) {
            return result.catch( e );
        }

        var url = BASE_URL;

        if ( language ) url += "&hl=" + language;

        try {
            var res = await this.#page.goto( url );
            res = result( res.status() );
        }
        catch ( e ) {
            res = result.catch( e );
        }

        if ( !res.ok ) {
            this.#page.context().close();

            this.#page = null;

            // repeat
            throw res;
        }
    }

    async #search ( keyword ) {

        // find query field
        const el = await this.#page.$( `input[name="q"]` );

        if ( !el ) return result( [500, `Query input element not found`] );

        var [res] = await Promise.all( [

            //
            this.#page.waitForNavigation(),
            el.type( keyword + "\n", { "delay": 100 } ),
        ] );

        res = result( res.status() );

        if ( !res.ok ) throw res;
    }

    async #getResults ( maxResults, businessName, emulateUser ) {
        const results = [];

        var position = 0;

        if ( businessName ) businessName = businessName.toLowerCase();

        // detect empty results
        if ( await this.#page.$( "div.section-bad-query-title" ) ) return result( 200 );

        COLLECT_RESULTS: while ( 1 ) {

            // find results elements
            const els = await this.#page.$$( "div.VkpGBb" );

            // no results elements found, this is selectors error
            if ( !els.length ) return result( [500, "Search results selector not found"] );

            for ( const el of els ) {
                if ( emulateUser ) {
                    el.hover();
                    await sleep( 1000 );
                }

                // skip ads
                if ( await el.$( "span.gghBu" ) ) continue;

                // find business name
                const resultBusinessName = await this.#getTextContent( el, `div[role="heading"]` );

                // unable to find business name
                if ( !resultBusinessName ) return result( [500, "Business name selector not found"] );

                // find clickToWebsite element
                let urlEl, url;

                // get target site url
                if ( ( urlEl = await el.$( `a.yYlJEf.L48Cpd` ) ) ) {
                    url = await urlEl.evaluate( el => el.getAttribute( "href" ) );
                }

                const item = {
                    "name": resultBusinessName,
                    "position": ++position,
                    url,
                };

                results.push( item );

                if ( businessName === item.name.toLowerCase() ) {
                    await this._onBusinessFound( el );

                    return result( 200, item );
                }

                if ( position >= maxResults ) break COLLECT_RESULTS;
            }

            // XXX
            const res = await this.#gotoNextPage();
            if ( res.status === 404 ) break COLLECT_RESULTS;
            else if ( !res.ok ) return res;
        }

        // if (target) return result(200);
        // else return result(200, data);

        return result( 200, results );
    }

    // XXX
    async #gotoNextPage () {

        // find next page button
        const next = await this.#page.$( "#pnnext" );

        // next page button not found
        if ( !next ) return result( 404 );

        // click next page
        await Promise.all( [

            //
            this.#page.waitForSelector( "div.rlfl__loading-overlay" ),
            next.click(),
        ] );

        await this.#page.waitForSelector( "div.rlfl__loading-overlay", { "state": "hidden" } );

        // XXX language
        // detect empty results
        if ( await this.#page.$( `text=There are no results here. Try searching in a different location.` ) ) return result( 404 );

        return result( 200 );
    }

    async #getAttribute ( el, selector, name ) {
        el = await el.$( selector );

        if ( el ) return el.getAttribute( name );
    }

    async #getTextContent ( el, selector ) {
        el = await el.$( selector );

        if ( el ) return el.textContent();
    }
}
