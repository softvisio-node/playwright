const withUtils = require( "../_utils/withUtils" );

module.exports = {
    defaults () {
        return {
            "vendor": "Google Inc.",
        };
    },

    onPageCreated () {
        return withUtils().evaluateOnNewDocument( ( utils, { opts } ) => {
            utils.replaceGetterWithProxy( Object.getPrototypeOf( navigator ), "vendor", utils.makeHandler().getterValue( opts.vendor ) );
        },
        {
            "opts": this.opts,
        } );
    }, // onPageCreated
};
