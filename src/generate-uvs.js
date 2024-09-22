import { runOperation } from './runOperation.js';
import { exec } from 'child_process';
import puppeteer from 'puppeteer';
import url from 'url';
import path from 'path';

const __filename = url.fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

runOperation( async ( { scene, buffer } ) => {

    // start up the puppeteer bundler
    const vite = exec( `npx vite ${ path.resolve( __dirname, './generate-uvs-script' ) }` );
	const browser = await puppeteer.launch( {
        headless: true,
        // devtools: true,
	} );

    // navigate to the page
	const page = await browser.newPage();
    await page.goto( 'http://localhost:5173' );
    page
        .on('console', message => console.log( message.text() ) )
        .on('pageerror', ({ message }) => console.log(message))
        .on('response', response => console.log(`${response.status()} ${response.url()}`))
        .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`))

    // pass the gltf buffer to the puppeteer instance
    // https://github.com/puppeteer/puppeteer/issues/2427#issuecomment-536002538
    const gltfString = Buffer.from( buffer ).toString( 'binary' );
    const finalBuffer = await page.evaluate( async ( ...args ) => {

        return await GENERATE_UV( ...args );

    }, gltfString );

    // close the processes
    await browser.close();
    vite.kill();

    // convert and return the gltf binary string
    return Buffer.from( finalBuffer, 'binary' ).buffer;

} );