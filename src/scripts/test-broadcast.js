/*
Improved test script – shows errors clearly
*/

const { io } = require('socket.io-client');

const SERVER_URL = 'http://127.0.0.1:3000';
const BROADCAST_ID = '6a36383c4cd598b855a5ede2';
const THREAD_ID = '6a36383c2ad3b2638edf04bc';
const SENDER_ID = '68acb8bea150fc1826314b11';
const RECEIVER_ID = '6878e2a22d2eb96861b2f598';
const TIMEOUT_MS = 10000;

let received = false;

console.log('Test config:', { SERVER_URL, BROADCAST_ID, THREAD_ID, SENDER_ID, RECEIVER_ID });

// ---------- Receiver ----------
const receiver = io(SERVER_URL + "/broadcast", {
    auth: { userId: RECEIVER_ID },
    transports: ['websocket'],
    reconnection: false,
});

receiver.on('connect', () => {
    console.log('[receiver] connected →', receiver.id);
    receiver.emit('joinThread', { threadId: THREAD_ID });
    console.log('[receiver] joined thread', THREAD_ID);
});

receiver.on('connect_error', (err) => {
    console.error('[receiver] connect_error:', err.message);
});

receiver.on('receiveBroadcastMessage', (payload) => {
    console.log('\n✅ [receiver] GOT receiveBroadcastMessage:');
    console.log(JSON.stringify(payload, null, 2));
    received = true;
    cleanup(0);
});

// ---------- Sender ----------
const sender = io(SERVER_URL + "/broadcast", {
    auth: { userId: SENDER_ID },
    transports: ['websocket'],
    reconnection: false,
});

sender.on('connect', () => {
    console.log('[sender] connected →', sender.id);
    sender.emit('joinThread', { threadId: THREAD_ID });

    setTimeout(() => {
        const payload = {
            broadcastId: BROADCAST_ID,
            threadId: THREAD_ID,
            senderId: SENDER_ID,
            receiverId: RECEIVER_ID,
            message: 'Hello from test ' + new Date().toISOString(),
        };

        console.log('\n[sender] emitting sendBroadcastMessage...');

        sender.emit('sendBroadcastMessage', payload, (ack) => {
            // This callback receives whatever the gateway returns (or the error)
            console.log('\n[sender] ACK from server:');
            console.dir(ack, { depth: null });

            if (ack?.status === 'error' || ack?.message?.includes?.('Exception') || ack?.error) {
                console.error('❌ Server returned an error → emit was NEVER called');
            }
        });
    }, 500);
});

sender.on('connect_error', (err) => {
    console.error('[sender] connect_error:', err.message);
});

// Timeout
setTimeout(() => {
    if (!received) {
        console.error('\n❌ TIMEOUT – no receiveBroadcastMessage received');
        console.error('Check NestJS server logs for errors from BroadcastService / BroadcastGateway');
        cleanup(2);
    }
}, TIMEOUT_MS);

function cleanup(code = 0) {
    try { receiver.disconnect(); } catch { }
    try { sender.disconnect(); } catch { }
    process.exit(code);
}

process.on('SIGINT', () => cleanup(0));