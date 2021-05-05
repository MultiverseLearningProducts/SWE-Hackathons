# Multiverse Software Engineering Hackathon I

A hackathon is a dedicated period of time for creative exploration around a software problem or challenge. As the name suggests it is often practiced in short intense bursts for example over 48 hours or a weekend.

The aim of hackathons can vary but here at Multiverse the aim of our hackathons is to apply all the programming and design skills we have developed so far and start to go beyond them! It is a creative endeavour and we are interested in the skills you can demonstrate, how you learn new things, and how you produce work in a group. If you also produce a working piece of software - then thats an awesome bonus.

## The first hack

This first hackathon aims to give you a chance to developing your programming logic and design skills by working as a team to develope a peer-to-peer messaging service.

We have given you some starter code that will connect your computer to other computers and enable you to send and receive text messages to and from connected peers who have the `'/multiverse/discovery/1.0.0'` protocol.

## Before you start

We are asking you to build on top of a low level networking library called `Libp2p`. Below are some important concepts to consider before you start to build your app on top of `Libp2p`.

## Peer to Peer networks

Peer to peer networks are formed by computers connecting directly to one another and passing data between themselves. These networks are decentralized in their structure. This is in contrast to a centralized network that is organised around servers to which clients connect in order to pass data around the network.

![a diagram of centralised and decentralised networks](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Decentralization_diagram.svg/1600px-Decentralization_diagram.svg.png)<small style="display:flex;align-items:center;font-size:.5rem;"><img src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/by-sa.svg" height="16px" style="margin-right:.5rem;"/> [File:Decentralization.jpg, by Adam Aladdin](https://commons.wikimedia.org/wiki/File:Decentralization_diagram.svg)</small>

What makes a peer a peer? For us a peer is a process running on a port. So a single computer can host many peers. You will be writing code that runs on a peer. The work of connecting to the network has been for you. You can look at the [Libp2p docs](https://docs.libp2p.io/) to learn more about your starter code.

## Building Your Protocol

The libp2p protocol you we want you to try building will need 3 key features:

#### A Protocol id

libp2p protocols have unique string identifiers, which are used in the [protocol negotiation](https://docs.libp2p.io/concepts/protocols/#protocol-negotiation) process when connections are first opened. These are refereed to as protocol ids.

By convention, protocol ids have a path-like structure, with a version number as the final component:

```
/multiverse/amazing-protocol/0.1.0
```

Breaking changes to your protocol's wire format or semantics should result in a new version
number. The version numbering convention used is called semver. You can [read about semver here](https://semver.org/).

#### Handler functions

To accept connections, a libp2p application will register handler functions for protocols using their protocol id.

```javascript
libp2p.handle('/multiverse/amazing-protocol/0.1.0', async ({ connection, stream }) => {
    // 'connection' this has information about the connection
    const remotePeerId = connection.remotePeer.toB58String()
    // 'stream' this is the data being send from a peer see below for more
})
```

The handler function will be invoked when an incoming stream is tagged with the registered protocol id. To send a stream to a peer with this protocol you would create a new stream and use the protocol id to 'tag' the connection. Below is an example of sending a stream from one peer to another peer that supports the `/multiverse/amazing-protocol/0.1.0` protocol.

```javascript
const { stream } = await connection.newStream(['/multiverse/amazing-protocol/0.1.0'])
await pipe('Hello world', stream)
```
More about streams below.

#### Packaged and published via npm

As a cohort you are all on the same peer network. Each team will build their own protocol. However at the end of the hackathon every team should be able to import and run every other teams protocol. In order to be able to do that we need each team to package and publish their protocol to npm.

To do that your final protocol id and handler function need to be exported via `module.exports` and published on npm so other teams can require your protocol.

Below is an example of how to export your protocol:

```javascript
const pipe = require('it-pipe')
// etc all your dependencies here

module.exports = {
    protocol: '/multiverse/amazing-protocol/0.1.0',
    handler: async ({ connection, stream }) => {
        // your handler code in here
    }
}
```
Because each team will follow this structure they will be able to register your protocol on their peer something like this:

```javascript
const teamTwoProtocol = require('team-two-protocol')

libp2p.handle(teamTwoProtocol.protocol, teamTwoProtocol.handler)
```
This means when you come to demo your messaging app everyone in the network will be able to install and use your protocol.

Its straight forward to publish packages to npm. Make sure you have a package.json file. You'll need an npm account and be logged in via the cli tool.
```sh
npm login
```
Enter your credentials as prompted. This will automatically generate an npm token and setup your .npmrc file for you. Then you can run.
```sh
npm publish
```

## Streams

How do you send data from one peer to another? Via streams. A stream is something you might not have come across before, but I bet you know what a train is!

![train](https://cdn.happyrail.com/images/cropped/1080/190/uploads/media/000003/mountains.jpg)

Think about the data being passed backwards and forwards between peers as little trains. A train is made up of a series of carriages. A stream is made up from your data. Your data is formed into chunks arranged like the carriages of a train. When a train arrives at a station not all the carriages arrive all at once they arrive one by one, one after another. In the same way when your handler function receives a stream, it does not arrive all at once.

#### it-pipe

The `pipe` function that comes from `it-pipe` will help you to consume and create streams that you can use to send and receive data from other peers. In the code example below you can see we use `pipe` to access the data in our incoming stream. Pipes are created by joining the output of one function so it becomes the input for the next function in the pipe. This is helping us as to read the whole stream. You can create elaborate pipelines by chaining functions together in a pipe. Below is an imaginary example.

```javascript
pipe(sourceDataStream, cleanNullValues, transformToMetric, addFullNameValues, insertIntoDB)
```
Our pipe will just be very simple

```javascript
pipe(stream, sink) // to read data from a stream
pipe(message, stream) // to send data via a stream
```

##### What is an Iterable Object

The stream we receive will be an iterable object. Think of a vending machine that you can push a button called `next`; while the vending machine has stock then it will give you one item each time you push the button. The vending machine is our source of items. Eventually we will empty the machine and when we push the button no item will be returned. At that point we have drained the vending machine (source).

##### Source to Sink

Where are you going to put all the items that you get from the vending machine? You need a `sink`. A sink is a function that does the job of repeatedly pushing the button to get items, and it usually does something with those items. In the code below we pipe our stream into a sink function. That sink function receives an iterable objected which is named `source`. The `for await` part of the code is like pressing the next button on a vending machine and getting an item. It will keep going in a for loop until the source is drained (returns false).

```javascript
pipe(
    stream,
    async function sink (source) {
        const message = []
        for await (const msg of source) {
            message.push(msg)
        }
        console.log(message.join(""))
    }
)
```
Can you see here we are basically collecting all the chunks (`msg`) of a message (`source`) chunk by chunk and pushing them into an array called `message`. When we have drained the source, we `console.log` out the message.

Using streams you can send not just text data, but other kinds of data like binary data (files).

## Summary

#### Day 1

|times|activity|
|----:|:-------|
|09:30|Kick off session|
|09:45|Introduction to iterable Streams|
|10:00|Design session and Hacking|
|12:00|Lunch|
|13:00|Hacking|
|15:00|The decentralized web talk (includes tea break)|
|15:30|Hacking|
|17:00|End of day 1|

#### Day 2

|times|activity|
|----:|:-------|
|09:30|Hacking|
|12:00|Lunch|
|13:00|Hacking|
|15:00|Group presentations|
|17:00|End of day 2|

We want you to design and build a piece of software in a creative and exploitative environment. We have started you off so you can all connect to each other via a peer to peer network. The way to build on top of this network is by implementing your own protocol.

1. Your challenge is to build a peer to peer messaging app.
1. You have starter code and you need to design and build your app on top of that starter code.
1. Your code needs to be in a module that can be required via npm.
1. You will have to send and receive data using streams.

#### Tips and ideas to get you started

* Create a team protocol based on the starter code so just your team members can message each other
* Users are identified by `[wfi78yo8w]` (the first 8 charactures of their peer id) how about capturing and using a username and displaying that next to their messages? i.e `[Paula_Pins]`
* Can you get this working in the [browser](https://github.com/libp2p/js-libp2p/tree/master/examples/libp2p-in-the-browser) with a UI?
* Could you support 'rooms' or ['topics'](https://github.com/ChainSafe/js-libp2p-gossipsub)