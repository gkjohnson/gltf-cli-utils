import { UVUnwrapper } from 'xatlas-three';
import { BufferAttribute } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Buffer } from 'buffer';

window.GENERATE_UV = async ( gltfString, xatlasString, wasmString ) => {

    // initialize the unwrapper
    const unwrapper = new UVUnwrapper( { BufferAttribute } );
    await unwrapper.loadLibrary(
        // ( mode, progress ) => console.log( mode, progress ),
        () => {},
        'https://cdn.jsdelivr.net/npm/xatlasjs@0.1.0/dist/xatlas.wasm',
        'https://cdn.jsdelivr.net/npm/xatlasjs@0.1.0/dist/xatlas.js',
    );

    // load and prepare the gltf
    const buffer = Buffer.from( gltfString, 'binary' ).buffer;
    const result = await new GLTFLoader().parseAsync( buffer );
    const scene = result.scene.children[ 0 ];
    scene.removeFromParent();
    scene.updateMatrixWorld();

    // find all geometries to unwrap
    const geometries = new Set();
    scene.traverse( c => {

        if ( c.geometry ) {

            geometries.add( c.geometry );

        }

    } );

    // unwrap geometries
    const geometryArray = Array.from( geometries );
    for ( let i = 0; i < geometryArray.length; i ++ ) {

        const geom = geometryArray[ i ];
        geom.deleteAttribute( 'uv' );
        await unwrapper.unwrapGeometry( geom, 'uv', 'uv' );

        console.log( 'progress', ( 100 * ( i + 1 ) / geometryArray.length ).toFixed( 2 ), '%' );

    }

    // rebundle the gltf
    const outputBuffer = await new GLTFExporter().parseAsync( scene, { binary: true } );
    return Buffer.from( outputBuffer ).toString( 'binary' );
};