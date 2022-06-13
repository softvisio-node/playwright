import withUtils from "../_utils/withUtils.js";

export default {
    defaults () {
        return {
            "vendor": "Google Inc.",
        };
    },

    onPageCreated () {
        return withUtils().evaluateOnNewDocument(
            ( utils, { opts } ) => {
                utils.replaceGetterWithProxy( Object.getPrototypeOf( navigator ), "vendor", utils.makeHandler().getterValue( opts.vendor ) );
            },
            {
                "opts": this.opts,
            }
        );
    }, // onPageCreated
};
