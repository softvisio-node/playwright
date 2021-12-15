import { sleep } from "#core/utils";

export default class BrowseSite {

    // public
    async run ( page ) {
        await page.waitForLoadState( "domcontentloaded" );

        const pagesToVisit = 3 + Math.floor( Math.random() * 7 );

        for ( let n = 0; n < pagesToVisit; n++ ) {
            const url = await this.#getRandomInternalLink( page );

            if ( !url ) break;

            // hover and click
            try {
                await url.hover();
                await url.click();
            }
            catch ( e ) {}

            await sleep( 5000 + Math.floor( Math.random() * 20000 ) );
        }
    }

    // private
    async #getRandomInternalLink ( page ) {
        const url = await page.evaluateHandle( () => {
            const els = document.querySelectorAll( "a" ),
                urls = {},
                base = window.location.href,
                hostname = new URL( base ).hostname;

            if ( els ) {
                for ( const el of els ) {
                    const href = el.getAttribute( "href" );

                    if ( !href ) continue;

                    const url = new URL( href, base );

                    if ( url.protocol !== "http:" && url.protocol !== "https:" ) continue;

                    if ( hostname !== url.hostname ) continue;

                    // remove fragment
                    url.hash = "";

                    urls[url.href] = el;

                    el.scrollIntoView( { "behavior": "smooth", "block": "center" } );
                }
            }

            delete urls[base];

            const elements = Object.values( urls );

            return elements[Math.floor( Math.random() * elements.length )];
        } );

        if ( !url ) return;

        return url.asElement();
    }
}
