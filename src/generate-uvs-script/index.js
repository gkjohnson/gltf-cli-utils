import { UVUnwrapper } from 'xatlas-three';
import { BufferGeometry, BufferAttribute } from 'three';
import { Buffer } from 'buffer';
import { WebIO, VertexLayout } from '@gltf-transform/core';

const ATTRIBUTES = {
	POSITION: 'position',
	NORMAL: 'normal',
	TANGENT: 'tangent',
	TEXCOORD_0: 'uv',
	TEXCOORD_1: 'uv1',
	TEXCOORD_2: 'uv2',
	TEXCOORD_3: 'uv3',
	COLOR_0: 'color',
	WEIGHTS_0: 'skinWeight',
	JOINTS_0: 'skinIndex',
};

const TYPES = {
    [ 1 ]: 'Scalar',
    [ 2 ]: 'VEC2',
    [ 3 ]: 'VEC3',
    [ 4 ]: 'VEC4',
};

const REV_ATTRIBUTES = {};
for ( const key in ATTRIBUTES ) {

    REV_ATTRIBUTES[ ATTRIBUTES[ key ] ] = key ;

}

function createPrimitiveGeometry( prim ) {

    const geom = new BufferGeometry();
    const names = prim.listSemantics();
    const accessors = prim.listAttributes();

    const indices = prim.getIndices();
    if ( indices ) {

        const bufferAttribute = new BufferAttribute( indices.getArray(), indices.getElementSize(), indices.getNormalized() );
        indexToUint16( bufferAttribute );
        geom.setIndex( bufferAttribute );

    }

    names.forEach( ( n, i ) => {

        const name = ATTRIBUTES[ n ] || n;
        const acc = accessors[ i ];
        const bufferAttribute = new BufferAttribute( acc.getArray(), acc.getElementSize(), acc.getNormalized() );
        geom.setAttribute( name, bufferAttribute );

    } );

    return geom;

}

function applyGeometryToPrimitive( geom, prim, document ) {

    if ( geom.index ) {

        prim.getIndices().setArray( geom.index.array );

    }

    const attributes = geom.attributes;
    const accessors = prim.listAttributes();
    const semantics = prim.listSemantics();
    for ( const key in attributes ) {

        const attr = attributes[ key ];
        const sem = REV_ATTRIBUTES[ key ] || key;
        if ( semantics.includes( sem ) ) {

            const accessor = accessors[ semantics.indexOf( sem ) ];
            accessor.setArray( attr.array );

        } else {

            const accessor = document
                .createAccessor( sem )
                .setArray( attr.array )
                .setType( TYPES[ attr.itemSize ] )
                .setNormalized( attr.normalized )
                .setBuffer( document.getRoot().listBuffers()[0] );

            prim.setAttribute( sem, accessor );

        }

    }

}

function indexToUint16( attr ) {

    const arr = new Uint16Array( attr.count );
    for ( let i = 0; i < attr.count; i ++ ) {

        const v = attr.getX( i );
        if ( v >= 2**16 - 1 ) {

            throw new Error();

        }

        arr[ i ] = v;

    }

    attr.array = arr;

}

let gltfString = '';
window.APPEND = str => {
    
    gltfString += str;
    
};

window.GENERATE_UV = async () => {

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
    const io = new WebIO();
    const document = await io.readBinary( new Uint8Array( buffer ) );
    const root = document.getRoot();
    const meshes = root.listMeshes();
    const prims = new Set();
    for ( const mi in meshes ) {

        const m = meshes[ mi ];
        const primitives = m.listPrimitives();
        for ( const pi in primitives ) {

            const p = primitives[ pi ];
            prims.add( p );

        }

    }

    const total = prims.size;
    let count = 0;
    prims.clear();
    for ( const mi in meshes ) {

        const m = meshes[ mi ];
        const primitives = m.listPrimitives();
        for ( const pi in primitives ) {
        
            const p = primitives[ pi ];
            if ( prims.has( p ) ) {

                continue;

            }

            prims.add( p );
            p.setAttribute( 'TEXCOORD_0', null );

            const geom = createPrimitiveGeometry( p );
            await unwrapper.unwrapGeometry( geom, 'uv', 'uv' );
            applyGeometryToPrimitive( geom, p, document );

            count ++;
            console.log( 'progress: ', ( 100 * count / total ).toFixed( 2 ), '%' );

        }
        
    }

    // rebundle the gltf
    const outputBuffer = await io
        .setVertexLayout( VertexLayout.SEPARATE )
        .writeBinary( document );
    
    const outputString = Buffer.from( outputBuffer ).toString( 'binary' );
    for ( let i = 0; i < outputString.length; i += 1e6 ) {

        console.log( 'transferring', ( 100 * i / outputString.length ).toFixed( 2 ), '%' )
        const str = outputString.substring( i, i + 1e6 );
        RETURN_CHUNK( str )

    }

};
