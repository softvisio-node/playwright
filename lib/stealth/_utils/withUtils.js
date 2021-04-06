const utils = require( "./index" );

module.exports = function () {
    return {

        /** Simple `page.evaluate` replacement to preload utils
         */
        // "evaluate": async function ( mainFunction, ...args ) {
        //     return page.evaluate( ( { _utilsFns, _mainFunction, _args } ) => {

        //         // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
        //         const utils = Object.fromEntries( Object.entries( _utilsFns ).map( ( [key, value] ) => [key, eval( value )] ) );
        //         utils.init();
        //         return eval( _mainFunction )( utils, ..._args );
        //     },
        //     {
        //         "_utilsFns": utils.stringifyFns( utils ),
        //         "_mainFunction": mainFunction.toString(),
        //         "_args": args || [],
        //     } );
        // },

        "evaluateOnNewDocument": function ( mainFunction, ...args ) {
            return [
                ( { _utilsFns, _mainFunction, _args } ) => {

                    // Add this point we cannot use our utililty functions as they're just strings, we need to materialize them first
                    const utils = Object.fromEntries( Object.entries( _utilsFns ).map( ( [key, value] ) => [key, eval( value )] ) );
                    utils.init();

                    return eval( _mainFunction )( utils, ..._args );
                },
                {
                    "_utilsFns": utils.stringifyFns( utils ),
                    "_mainFunction": mainFunction.toString(),
                    "_args": args || [],
                },
            ];
        },
    };
};
