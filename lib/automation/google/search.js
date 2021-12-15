import Google from "#lib/automation/google";
import { quoteMeta, sleep } from "#core/utils";

const BASE_URL = "https://www.google.com/?num=100";

export default class GoogleSearch extends Google {

    // protected
    get _url () {
        return BASE_URL;
    }

    async _getResults ( { page, maxResults, target, emulateUser } ) {
        const results = [];

        var position = 0;

        target = this.#createRegExp( target );

        // detect empty results
        if ( !( await page.$( "div#result-stats" ) ) ) return result( 200 );

        COLLECT_RESULTS: while ( 1 ) {

            // find results elements
            const els = await page.$$( "div.g" );

            // no results elements found, this is selectors error
            if ( !els.length ) return result( [500, "Search results selector not found"] );

            for ( const el of els ) {
                if ( emulateUser ) {
                    await el.hover();

                    await sleep( 10 + Math.floor( Math.random() * 1000 ) );
                }

                // parse element
                const item = {
                    "position": ++position,
                    "title": await ( await el.$( "h3" ) )?.textContent(),
                    "description": await ( await el.$( "div.IsZvec" ) )?.textContent(),
                    "url": await ( await el.$( "div.yuRUbf > a", "href" ) )?.getAttribute( "href" ),
                };

                results.push( item );

                if ( target ) {
                    let url;

                    try {
                        url = new URL( item.url );
                        url = url.hostname + url.pathname;
                    }
                    catch ( e ) {}

                    // target found
                    if ( url && target.test( url ) ) {
                        await this._onTargetFound( page, el );

                        return result( 200, item );
                    }
                }

                if ( position >= maxResults ) break COLLECT_RESULTS;
            }

            // no next page available
            if ( !( await this.#gotoNextPage( page ) ) ) break COLLECT_RESULTS;
        }

        if ( target ) return result( 200 );
        else return result( 200, results );
    }

    // private
    #createRegExp ( target ) {
        if ( !target ) return;

        if ( target.startsWith( "*." ) ) target = target.substr( 2 );

        target = quoteMeta( target );

        target = "(.*\\.)?" + target;

        if ( target.endsWith( "\\*" ) ) target = target.substr( 0, target.length - 2 ) + ".*";

        if ( !target.includes( "/" ) ) target += "\\/.*";

        target = new RegExp( "^" + target + "$", "i" );

        return target;
    }

    async #gotoNextPage ( page ) {

        // find next page button
        const next = await page.$( "a#pnnext" );

        // next page button not found
        if ( !next ) return false;

        var reload;

        for ( let n = 0; n < 10; n++ ) {
            try {

                // click next page
                await Promise.all( [

                    //
                    page.waitForNavigation(),
                    reload ? page.reload() : next.click(),
                ] );

                return true;
            }
            catch ( e ) {
                reload = true;

                continue;
            }
        }

        throw result( [500, `Unable to fetch google searcj results page`] );
    }
}
