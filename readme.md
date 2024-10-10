# BetaCrew Client

This repository contains a Node.js client for connecting to the BetaCrew exchange server. It streams packets of data, checks for missing sequences, and saves the received packets to a JSON file.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Output](#output)

## Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 16.17.0 or higher recommended)
- npm (Node package manager, included with Node.js)

## Installation

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/ghostbadfame/betacrew-client.git
2. Navigate into the project directory:

   ```bash
   cd betacrew-client
3. Install the required dependencies:

   ```bash
   npm install
4. To run the BetaCrew client, use the following command:

   ```bash
   npm start
The client will connect to the BetaCrew exchange server (default is localhost on `port 3000`). It will stream all packets, check for any missing sequences, and save the output to output.json.

## Configuration
You can modify the host and port in the main.js file if you need to connect to a different server.

## Output
After running the client, you will find a file named `output.json` in the project directory. This file contains all the received packets in JSON format.

## Instruction

- The BetaCrew server operates on TCP protocol.
- Connect to the server using the hostname or IP address and `port number (3000)` where the server is running.

## Algorithm Summary

The algorithm consists of the following main functionalities:

1. **Initialization**: 
   - The client initializes with default parameters for the server's host and port, sets the packet size (17 bytes), and initializes arrays and sets to keep track of received packets and any missing packet sequences.

2. **Connection**:
   - The `connect()` method establishes a TCP connection to the server using the specified host and port, handling connection errors and resolving a promise upon successful connection.

3. **Packet Streaming**:
   - The `streamAllPackets()` method sends a request to the server to start streaming all packets. Incoming data is buffered until a complete packet can be parsed, which is then stored in an array with its highest packet sequence number tracked.

4. **Packet Parsing**:
   - The `parsePacket()` method converts raw binary data into a structured packet format with relevant fields (symbol, buy/sell indicator, quantity, price, and packet sequence number).

5. **Missing Sequence Detection**:
   - The `findMissingSequences()` method identifies gaps in the received packet sequence and adds these to a set of missing sequences.

6. **Requesting Missing Packets**:
   - The `requestMissingPackets()` method iterates over the set of missing sequences and requests each missing packet from the server using the `requestPacket()` method.

7. **File Output**:
   - The `writeOutputToFile()` method writes the collected packets to a file named `output.json`.

8. **Data Fetching Workflow**:
   - The `fetchAllData()` method orchestrates the entire process, connecting to the server, streaming packets, identifying and requesting missing packets, sorting the received packets by sequence number, and writing the final output to a file.

9. **Execution**:
   - An instance of `BetaCrewExchangeClient` is created, and the `fetchAllData()` method is invoked to initiate the entire data fetching process.

