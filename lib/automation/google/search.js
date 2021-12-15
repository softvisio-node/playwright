import Google from "#lib/automation/google";
import { sleep } from "#core/utils";

const BASE_URL = "https://www.google.com/?num=100";

export default class GoogleSearch extends Google {

    // protected
    get _url () {
        return BASE_URL;
    }

    async _getResults ( { page, maxResults, target, emulateUser } ) {
        const results = [];

        var position = 0;

        if ( target ) target = target.toLowerCase();

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
                const businessNameEl = await el.$( `div[role="heading"]` );

                const businessName = businessNameEl ? await businessNameEl.textContent() : null;

                // unable to find business name
                if ( !businessName ) return result( [500, "Business name selector not found"] );

                // find clickToWebsite element
                let urlEl, url;

                // get target site url
                if ( ( urlEl = await el.$( `a.yYlJEf.L48Cpd` ) ) ) {
                    url = await urlEl.getAttribute( "href" );
                }

                const item = {
                    "name": businessName,
                    "position": ++position,
                    url,
                };

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

    // private
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
