import { objectPick } from "#core/utils";
import withUtils from "../_utils/withUtils.js";

export default {
    onPageCreated ( options = {} ) {
        options = objectPick( options, [ "webglVendor", "webglRenderer" ] );

        return withUtils().evaluateOnNewDocument( ( utils, options ) => {
            const getParameterProxyHandler = {
                "apply": function ( target, ctx, args ) {
                    const param = ( args || [] )[ 0 ];

                    // UNMASKED_VENDOR_WEBGL
                    if ( param === 37_445 ) {
                        return options.webglVendor || "Intel Inc."; // default in headless: Google Inc.
                    }

                    // UNMASKED_RENDERER_WEBGL
                    if ( param === 37_446 ) {
                        return options.webglRenderer || "Intel Iris OpenGL Engine"; // default in headless: Google SwiftShader
                    }

                    return utils.cache.Reflect.apply( target, ctx, args );
                },
            };

            // There's more than one WebGL rendering context
            // https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext#Browser_compatibility
            // To find out the original values here: Object.getOwnPropertyDescriptors(WebGLRenderingContext.prototype.getParameter)
            const addProxy = ( obj, propName ) => {
                utils.replaceWithProxy( obj, propName, getParameterProxyHandler );
            };

            // For whatever weird reason loops don't play nice with Object.defineProperty, here's the next best thing:
            addProxy( WebGLRenderingContext.prototype, "getParameter" );
            addProxy( WebGL2RenderingContext.prototype, "getParameter" );
        }, options );
    },
};
