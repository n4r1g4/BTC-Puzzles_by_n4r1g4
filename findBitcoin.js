const { Worker, isMainThread, workerData } = require('worker_threads');

const min = 0x20000000000000000n;
const max = 0x3ffffffffffffffffn;
const numThreads = 4; // Número de threads paralelos
const wallets = ['1L12FHH2FHjvTviyanuiFVfmzCy46RRATU'];

const startTime = Date.now();
   
// Cria um SharedArrayBuffer para o contador e um flag de controle
const sharedBuffer = new SharedArrayBuffer(8);
const counter = new Int32Array(sharedBuffer, 0, 1);
const foundFlag = new Int32Array(sharedBuffer, 4, 1);

// Função para criar workers
function createWorker(start, end) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./worker.js', {
            workerData: { start, end, wallets, sharedBuffer }
        });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker parou com código de saída ${code}`));
        });
    });
}

// Função principal para distribuir o intervalo entre os workers
async function main() {
    const range = (max - min) / BigInt(numThreads);
    const promises = [];
    for (let i = 0; i < numThreads; i++) {
        const start = min + BigInt(i) * range;
        const end = (i === numThreads - 1) ? max : start + range - 1n;
        promises.push(createWorker(start, end));
    }

    // Intervalo para exibir o contador a cada segundo
    const intervalId = setInterval(() => {
        console.log(`Chaves testadas até agora: ${Atomics.load(counter, 0)}`);
    }, 1000);

    try {
        await Promise.all(promises);
        console.log('Todos os workers completaram com sucesso');
    } catch (error) {
        console.error(error);
    } finally {
        clearInterval(intervalId);
        console.log('Tempo: ', (Date.now() - startTime) / 1000, 'segundos');
        console.log('Chaves testadas no total: ', Atomics.load(counter, 0));
    }
}

if (isMainThread) {
    main();
}
