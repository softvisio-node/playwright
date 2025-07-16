import { sleep } from "#core/utils";
import Google from "#lib/automation/google";

// const BASE_URL = "https://www.google.com/search?npsic=0&rflfq=1&rldoc=1&tbm=lcl&sa=X";
const BASE_URL = "https://www.google.com/?";

export default class GoogleMyBusiness extends Google {

    // protected
    get _url () {
        return BASE_URL;
    }

    async _getResults ( { page, maxResults, target, emulateUser } ) {

        // goto gmb

        var desktop;

        var gmb = await page.$( "div.c3mZkd g-more-link a" );

        if ( gmb ) {
            desktop = true;
        }
        else {

            // mobile
            // gmb = await page.$( `a[href^="/localservices/prolist?g2lb="]` );
            gmb = await page.$( "a.rFKvAe" ); // sort by distance
            // gmb = await page.$( `g-img.fIdtQ` );
        }

        if ( !gmb ) return result( [ 500, "GMB selector not found" ] );

        try {
            await Promise.all( [

                //

                gmb.click(),
                page.waitForNavigation(),
            ] );
        }
        catch {
            return result( [ 500, "GMB link click error" ] );
        }

        if ( desktop ) return this.#getResultsDesktop( { page, maxResults, target, emulateUser } );
        else return this.#getResultsMobile( { page, maxResults, target, emulateUser } );
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

            var card = await page.$( "div.immersive-container" );

            // mobile
            card ||= page;

            // browse reviews
            const reviews = await card.$$( "g-review-stars" );

            for ( const review of reviews ) {
                try {

                    // await review.scrollIntoViewIfNeeded();
                    await review.hover( { "trial1": true, "timeout1": 1 } );

                    await sleep( 1000 );
                }
                catch {}

                // await sleep( 3000 );
            }

            // open and browse target site
            const websiteButton = await card.$( "a.RFlwHf" );
            if ( websiteButton ) {
                await new Promise( resolve => {
                    page.context().once( "page", async page => {
                        await this._browseTargetSite( page );

                        resolve();
                    } );

                    websiteButton.click( { "modifiers": [ "Control" ] } );
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
    async #getResultsDesktop ( { page, maxResults, target, emulateUser } ) {
        const results = [];

        var position = 0;

        if ( target ) target = target.toLowerCase();

        // detect empty results
        if ( await page.$( "div.section-bad-query-title" ) ) return result( 200 );

        COLLECT_RESULTS: while ( true ) {

            // find results elements
            const els = await page.$$( "div.VkpGBb" );

            // no results elements found, this is selectors error
            if ( !els.length ) return result( [ 500, "Search results selector not found" ] );

            for ( const el of els ) {
                if ( emulateUser ) {
                    try {
                        await el.hover();
                    }
                    catch {}

                    await sleep( 10 + Math.floor( Math.random() * 1000 ) );
                }

                // skip ads
                if ( await el.$( "span.gghBu" ) ) continue;

                const item = {
                    "name": await ( await el.$( `div[role="heading"]` ) )?.textContent(),
                    "position": ++position,
                    "url": await ( await el.$( "a.yYlJEf.L48Cpd" ) )?.getAttribute( "href" ),
                };

                // unable to find business name
                if ( !item.name ) return result( [ 500, "Business name selector not found" ] );

                results.push( item );

                if ( target === item.name.toLowerCase() ) {
                    await this._onTargetFound( page, el );

                    return result( 200, item );
                }

                if ( position >= maxResults ) break COLLECT_RESULTS;
            }

            // no next page available
            if ( !( await this.#gotoNextPage( page ) ) ) break COLLECT_RESULTS;
        }

        if ( target ) return result( 200 );
        else return result( 200, results );
    }

    // XXX skip ads
    async #getResultsMobile ( { page, maxResults, target, emulateUser } ) {
        const results = [];

        var position = 0;

        if ( target ) target = target.toLowerCase();

        // detect empty results
        // XXX
        if ( await page.$( "div.section-bad-query-title" ) ) return result( 200 );

        COLLECT_RESULTS: while ( true ) {

            // find results elements
            // const els = await page.$$( `div[role="listitem"]` );
            const els = await page.$$( "div.l6Ea0c" );

            // no results elements found, this is selectors error
            if ( !els.length ) return result( [ 500, "Search results selector not found" ] );

            // remove already seen elements
            els.splice( 0, position );

            // end of list
            if ( !els.length ) break;

            for ( const el of els ) {
                if ( emulateUser ) {
                    try {
                        await el.hover();
                    }
                    catch {}

                    await sleep( 10 + Math.floor( Math.random() * 1000 ) );
                }

                // skip ads
                // XXX
                // if ( await el.$( "span.gghBu" ) ) continue;

                const item = {

                    // "name": await ( await el.$( `div.rgnuSb` ) )?.textContent(),
                    "name": await ( await el.$( `div[role="heading"]` ) )?.textContent(),
                    "position": ++position,
                    "url": await ( await el.$( "a.yYlJEf.L48Cpd" ) )?.getAttribute( "href" ),
                };

                // unable to find business name
                if ( !item.name ) return result( [ 500, "Business name selector not found" ] );

                results.push( item );

                if ( target === item.name.toLowerCase() ) {
                    await this._onTargetFound( page, el );

                    return result( 200, item );
                }

                if ( position >= maxResults ) break COLLECT_RESULTS;
            }

            // no next page available
            // if ( !( await this.#gotoNextPage( page ) ) ) break COLLECT_RESULTS;
        }

        if ( target ) return result( 200 );
        else return result( 200, results );
    }

    async #gotoNextPage ( page ) {

        // find next page button
        const next = await page.$( "#pnnext" );

        // next page button not found
        if ( !next ) return false;

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

        // await page.waitForNavigation();

        await sleep( 1000 );

        return true;
    }
}
