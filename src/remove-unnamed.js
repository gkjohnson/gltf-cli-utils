import { runOperation } from './runOperation.js';

function isNonUniformScale( scale ) {

    return scale.x !== scale.y || scale.x !== scale.z;

}

function isIdentityRotation( euler ) {

    return euler.x === 0 && euler.y === 0 && euler.z === 0;

}

runOperation( ( { scene } ) => {

    const unnamedNodes = [];
    scene.traverse( c => {

        if ( c.name === '' && ! c.isMesh ) {

            unnamedNodes.push( c );

        }

    } );

    let removed = 0;
    scene.updateMatrixWorld();
    unnamedNodes.reverse().forEach( ( n, i ) => {

        if ( isNonUniformScale( n.scale ) ) {

            let skip = false;
            n.children.forEach( c => {

                if ( ! isIdentityRotation( c.euler ) ) {

                    console.warn( `Skipping empty node collapse to due "${ n.scale.toArray().join() }" scale on parent and "${ c.euler.toArray().join() }" rotation on child.` );
                    skip = true;    

                }

            } );

            if ( skip ) {

                return;

            }

        }

        if ( n.parent ) {

            [ ...n.children ].forEach( c => {

                c.matrix.premultiply( n.matrix );
                c.matrix.decompose( c.position, c.quaternion, c.scale );
                n.parent.add( c );

            } );

            n.removeFromParent();
            removed ++;

        } else if ( n.children.length === 1 ) {

            const child = n.children[ 0 ];
            child.matrix.premultiply( n.matrix );
            child.matrix.decompose( child.position, child.quaternion, child.scale );
            child.removeFromParent();
            scene = child;
            removed ++;

        }

    } );

    console.log( `Found ${ unnamedNodes.length } unnamed nodes, removed ${ removed }.` );

    return scene;

} );