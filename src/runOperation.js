import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { readFileSync, writeFileSync } from 'fs';
import yargs from 'yargs';
import url from 'url';
import path from 'path';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
global.FileReader = window.FileReader;
global.Blob = window.Blob;

const __filename = url.fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

export async function runOperation( callback ) {
    
    const argv = yargs( process.argv.slice( 2 ) ).argv;
    const [ inputArg, outputArg ] = argv._;

    const inputPath = path.resolve( process.cwd(), inputArg );
    const outputPath = path.resolve( process.cwd(), outputArg );

    const buffer = readFileSync( inputPath, { encoding: null } );
    const arrayBuffer = Uint8Array.prototype.slice.apply( buffer ).buffer;

    const result = await new GLTFLoader().parseAsync( arrayBuffer );
    result.buffer = arrayBuffer;

    const inputScene = result.scene.children[ 0 ];
    inputScene.removeFromParent();
    inputScene.updateMatrixWorld();
    result.scene = inputScene;
    
    const scene = await callback( result );

    if ( scene.isObject3D ) {
    
        const outputBuffer = await new GLTFExporter().parseAsync( scene, { binary: true } );
        writeFileSync( outputPath, new Uint8Array( outputBuffer ) );

    } else {

        writeFileSync( outputPath, new Uint8Array( scene.buffer ? scene.buffer : scene ) );

    }

}