import { runOperation } from './runOperation.js';

function numberWithCommas(x) {

    // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
    return x.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' );

}

function getTriangleCount( geometry ) {

    if ( geometry.index ) {
                
        return geometry.index.count / 3;

    } else {
        
        return geometry.attributes.position.count / 3;

    }

}

function log( field, value, unit = '' ) {

    console.log( field.padEnd( 30, ' ' ).padStart( 35, ' ' ) + ': ' + numberWithCommas( value ) + ' ' + unit );

}

runOperation( ( { scene, parser, buffer } ) => {

    let totalTriangles = 0;
    let totalNodes = 0;
    let totalDrawCalls = 0;

    let drawnTriangles = 0;

    const geomSet = new Set();
    const matSet = new Set();
    scene.traverse( c => {

        totalNodes ++;

        if ( c.isMesh ) {

            geomSet.add( c.geometry );
            matSet.add( c.material );

            drawnTriangles += getTriangleCount( c.geometry );
            totalDrawCalls ++;

        }

    } );

    geomSet.forEach( g => {

        totalTriangles += getTriangleCount( g );

    } );

    console.log( 'GLTF Stats' );

    log( 'Nodes', parser.json.nodes.length );
    log( 'Meshes', parser.json.meshes.length );
    log( 'Mesh Nodes', parser.json.nodes.filter( n => 'mesh' in n ).length );
    log( 'Materials', parser.json.materials.length );
    log( 'File Size', parseFloat( ( 1e-6 * buffer.byteLength ).toFixed( 2 ) ), 'Mb' );

    console.log( '' );
    console.log( 'Three.js Stats' );
    log( 'Unique Materials', matSet.size );
    log( 'Unique Geometries', geomSet.size );
    log( 'Objects', totalNodes );
    log( 'Meshes', totalDrawCalls );
    log( 'Total Triangles', totalTriangles, 'tris' );
    log( 'Drawn Triangles', drawnTriangles, 'tris' );

} );
