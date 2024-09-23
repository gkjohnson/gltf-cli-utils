import { Matrix4, Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { runOperation } from './runOperation.js';

const _identityMatrix = new Matrix4().identity();

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

runOperation( ( { scene, parser } ) => {

    // Find all mesh nodes that have been separated out into separate primitives
    let total = 0;
    let completed = 0;
    const primitivesToMerge = [];
    scene.traverse( c => {

        const info = parser.associations.get( c );
        if ( info && 'meshes' in info && 'nodes' in info && ! c.isMesh ) {

            total ++;
            primitivesToMerge.push( c );

        }

    } );

    // Convert all meshes to merged variants
    const mergedGeometry = new Map();
    primitivesToMerge.forEach( c => {

        // Merge all the child primitives into a single geometry
        const info = parser.associations.get( c );
        const hash = hashMesh( parser.json.meshes[ info.meshes ] );
        if ( ! mergedGeometry.has( hash ) ) {

            const geometries = c.children.map( c => {
                
                const geom = c.geometry.clone();
                if ( ! c.matrix.equals( _identityMatrix ) ) {

                    geom.applyMatrix4( c.matrix );

                }

                return geom;
                
            } );
            mergedGeometry.set( hash, mergeGeometries( geometries ) );

        }

        // Create a new Mesh surrogate
        const geometry = mergedGeometry.get( hash );
        const material = c.children[ 0 ].material;
        const mesh = new Mesh( geometry, material );
        mesh.name = c.name;
        mesh.position.copy( c.position );
        mesh.quaternion.copy( c.quaternion );
        mesh.scale.copy( c.scale );

        // Re-assign the native gltf association
        parser.associations.set( mesh, info );

        // Replace the original node
        if ( c.parent ) {

            c.parent.add( mesh );
            c.removeFromParent();

        } else if ( c === scene ) {

            scene = mesh;

        }

        // Check material compatibility
        let found = false;
        c.children.forEach( c => {

            // TODO: we could merge these into subranges? Vertex colors? Can't be retained on load to engines
            if ( c.material !== material ) {
             
                found = true;

            }

        } );

        if ( found ) {

            console.warn( `Merging primitives with different materials for mesh "${ mesh.name }"` );

        }

        completed ++;
        console.log( `progress: ${ completed } / ${ total }` );

    } );

    //

    // Find parents of meshes that have had a custom name introduced
    const namedNodesToMerge = new Set();
    scene.traverse( c => {

        if ( /mesh_/.test( c.name ) || /instance_/.test( c.name ) ) {

            namedNodesToMerge.add( c.parent );

        }

    } );

    // Merge all geometry within the parents
    const geometryCache = new Map();
    namedNodesToMerge.forEach( node => {

        // Check if any of the parents have a named internal node and skip if so
        let skip = false;
        node.children.forEach( c => {

            const info = parser.associations.get( c );
            if ( ! ( 'meshes' in info ) && c.name !== '' ) {

                skip = true;

            }

        } );

        if ( skip ) {

            console.warn( `Skipping merging ${ node.name } due to named child.` );
            return;

        }

        // Clone the node hierarchy
        const cloned = node.clone();
        cloned.position.set( 0, 0, 0 );
        cloned.quaternion.identity();
        cloned.scale.set( 1, 1, 1 );
        cloned.updateMatrixWorld();

        // Get the transformed geometries to merge
        let material = null;
        let diffMaterials = false;
        const geometries = [];
        cloned.traverse( c => {

            if ( c.geometry ) {

                const matrixHash = c.matrixWorld.elements.map( e => e.toFixed( 3 ) ).join( ',' );
                const geometryHash = c.geometry.uuid + '_' + matrixHash;
                const geometryClone = c.geometry.clone().applyMatrix4( c.matrixWorld );
                geometryClone.__hash = geometryHash;
                geometries.push( geometryClone );

            }

            if ( ! material && c.material ) {

                material = c.material;

            } else if ( c.material !== material ) {

                diffMaterials = true;

            }

        } );
        
        if ( diffMaterials ) {

            console.warn( `Merging primitives with different materials for mesh "${ node.name }"` );

        }

        // Ensure we have a consistent hash order
        geometries.sort( ( a, b ) => {

            if ( a.__hash > b.__hash ) return - 1;
            if ( a.__hash < b.__hash ) return 1;
            return 0;

        } );

        const hash = geometries.map( g => g.__hash ).join( ':' );
        if ( ! geometryCache.has( hash ) || true ) {

            geometryCache.set( hash, mergeGeometries( geometries ) );

        }

        const merged = geometryCache.get( hash );
        const mesh = new Mesh( merged, material );
        mesh.name = node.name;
        mesh.position.copy( node.position );
        mesh.quaternion.copy( node.quaternion );
        mesh.scale.copy( node.scale );

        node.parent.add( mesh );
        node.removeFromParent();

        // Re-assign the associations
        parser.associations.set( mesh, parser.associations.get( node ) );

    } );

    // Revert the names to the original file versions before indices are appended
    scene.traverse( c => {

        const info = parser.associations.get( c );
        if ( info ) {
         
            c.name = parser.json.nodes[ info.nodes ].name;

        }

    } );

    return scene;

} );
