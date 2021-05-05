'use strict'
const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Websockets = require('libp2p-websockets')
const WebRTCStar = require('libp2p-webrtc-star')
const wrtc = require('wrtc')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Bootstrap = require('libp2p-bootstrap')
const MDNS = require('libp2p-mdns')
const KadDHT = require('libp2p-kad-dht')
const pipe = require('it-pipe')

async function main () {
    const libp2p = await Libp2p.create({
        addresses: {
            listen: [
                '/ip4/0.0.0.0/tcp/0',
                '/ip4/0.0.0.0/tcp/0/ws',
                `/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/`
            ]
        },
        modules: {
            transport: [TCP, Websockets, WebRTCStar],
            streamMuxer: [Mplex],
            connEncryption: [NOISE],
            peerDiscovery: [Bootstrap, MDNS],
            dht: KadDHT
        },
        config: {
            transport: {
                [WebRTCStar.prototype[Symbol.toStringTag]]: {
                    wrtc
                }
            },
            peerDiscovery: {
                bootstrap: {
                    list: [
                        '/dnsaddr/ams-2.bootstrap.libp2p.io/tcp/4001/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
                        '/ip4/138.68.177.116/tcp/63785/p2p/QmdzW9uxVD6cKnVCxpq78cVeciMnLexKnrPN4zc7NMwCee',
                        '/ip4/138.68.177.116/tcp/63785/ws/p2p-webrtc-star/p2p/QmdzW9uxVD6cKnVCxpq78cVeciMnLexKnrPN4zc7NMwCee'
                    ]
                }
            },
            dht: {
                enabled: true,
                randomWalk: {
                    enabled: true
                }
            }
        }
    })

    await libp2p.start()

    libp2p.handle('/multiverse/discovery/1.0.0', async ({ connection, stream }) => {
        try {
            await pipe(
                stream,
                async function (source) {
                    const message = []
                    for await (const msg of source) {
                        message.push(msg)
                    }
                    console.log(`[${connection.remotePeer.toB58String().substring(0,8)}] ${message.join("")}`)
                }
            )
        } catch (err) {
            console.error(err)
        }
    })

    process.stdin.on('data', (message) => {
        message = message.slice(0, -1)
        libp2p.peerStore.peers.forEach(async (peer) => {
            if (!peer.protocols.includes('/multiverse/discovery/1.0.0')) return
            const connection = await libp2p.registrar.getConnection(peer.id)
            try {
                const { stream } = await connection.newStream(['/multiverse/discovery/1.0.0'])
                await pipe(
                    String(message),
                    stream
                )
            } catch (err) {
                console.error(`Could not negotiate stream with peer ${peer.id.toB58String()}`, err)
            }
        })
    })

    libp2p.transportManager.getAddrs().forEach(ma => console.log(`${ma.toString()}/p2p/${libp2p.peerId.toB58String()}`))
}

main()