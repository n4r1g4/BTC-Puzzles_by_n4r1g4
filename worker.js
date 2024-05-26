const { parentPort, workerData } = require('worker_threads');
const bitcoin = require('bitcoinjs-lib');
const crypto = require('crypto');

const { start, end, wallets, sharedBuffer } = workerData;
const counter = new Int32Array(sharedBuffer, 0, 1);
const foundFlag = new Int32Array(sharedBuffer, 4, 1);

// Função para testar a chave privada
function testPrivateKey(privateKey) {
    try {
        const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
        const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
        return address;
    } catch (error) {
        return null;
    }
}

// Função para gerar uma chave privada aleatória
function generateRandomPrivateKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Função principal do worker
function run() {
    for (let i = start; i <= end; i++) {
        // Verifica se a chave já foi encontrada por outro worker
        if (Atomics.load(foundFlag, 0) === 1) {
            parentPort.postMessage(`Worker parando, chave já encontrada por outro worker.`);
            return;
        }

        const privateKey = generateRandomPrivateKey();
        const address = testPrivateKey(privateKey);
        Atomics.add(counter, 0, 1); // Incrementa o contador compartilhado
        if (wallets.includes(address)) {
            Atomics.store(foundFlag, 0, 1); // Sinaliza que a chave foi encontrada
            parentPort.postMessage(`Chave encontrada! Chave privada: ${privateKey} - Endereço: ${address}`);
            return;
        }
    }
    parentPort.postMessage(`Intervalo ${start} - ${end} completado sem encontrar a chave.`);
}

run();
