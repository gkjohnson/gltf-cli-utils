import { Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { runOperation } from './runOperation.js';

function hashPrimitive( prim ) {

    const keys = [
        `INDEX_${ prim.index ?? - 1 }`,
        `MODE_${ prim.mode ?? - 1 }`,
        Object.entries( prim.attributes ).map( e => e.join( '_' ) ),
    ]

    return keys.sort().join( '_' );

}

function hashMesh( mesh ) {

    return mesh.primitives.map( p => hashPrimitive( p ) ).join( ' ' );

}

function getObjectAssociation( associations, node, mesh ) {

    return Array.from( associations.entries() ).find( ( [ value, key ] ) => {
        
        return key.nodes === node
    
    } )[ 0 ];

}

runOperation( ( { scene, parser } ) => {

    let total = 0;
    let completed = 0;
    parser.json.nodes.forEach( ( n, i ) => {

        if ( ! ( 'mesh' in n ) ) {

            return;

        }

        const object = getObjectAssociation( parser.associations, i );
        if ( ! object.isMesh ) {

            total ++;

        }

    } );

    const mergedGeometry = new Map();
    parser.json.nodes.forEach( ( n, i ) => {

        if ( ! ( 'mesh' in n ) ) {

            return;

        }

        const object = getObjectAssociation( parser.associations, i );
        if ( ! object.isMesh ) {

            const hash = hashMesh( parser.json.meshes[ n.mesh ] );
            if ( ! mergedGeometry.has( hash ) ) {

                const geometries = object.children.map( c => c.geometry );
                mergedGeometry.set( hash, mergeGeometries( geometries ) );

            }

            const geometry = mergedGeometry.get( hash );
            const material = object.children[ 0 ].material;
            const mesh = new Mesh( geometry, material );

            mesh.name = object.name;
            mesh.position.copy( object.position );
            mesh.quaternion.copy( object.quaternion );
            mesh.scale.copy( object.scale );

            object.parent.add( mesh );
            object.removeFromParent();

            let found = false;
            object.children.forEach( c => {

                if ( c.material !== material ) found = true;

            } );

            if ( found ) {

                console.warn( `Merging primitives with different materials for mesh "${ mesh.name }"` );

            }

            completed ++;
            console.log( `progress: ${ completed } / ${ total }` );

        }

    } );

    return scene;

} );