const net = require("net");
const fs = require("fs").promises;

class BetaCrewExchangeClient {
  constructor(host = "localhost", port = 3000) {
    this.host = host;
    this.port = port;
    this.packetSize = 17;
    this.packets = []; // Array to store received packets
    this.missingSequences = new Set(); // Set to track missing packet sequences
    this.highestSequence = 0; // Track the highest packet sequence number received
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client = new net.Socket(); // Create a new TCP socket
      this.client.connect(this.port, this.host, () => {
        console.log("Connected to server");
        resolve();
      });
      this.client.on("error", (error) => {
        console.error("Connection error:", error);
        reject(error);
      });
    });
  }

  streamAllPackets() {
    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0); // Initialize a buffer to store incoming data

      this.client.on("data", (data) => {
        buffer = Buffer.concat([buffer, data]); // Append incoming data to the buffer
        while (buffer.length >= this.packetSize) {
          const packet = this.parsePacket(buffer.slice(0, this.packetSize)); // Parse the packet
          this.packets.push(packet); // Store the packet
          this.highestSequence = Math.max(
            this.highestSequence,
            packet.packetSequence
          ); // Update highest sequence
          buffer = buffer.slice(this.packetSize); // Remove the processed packet from the buffer
        }
      });

      this.client.on("end", () => {
        console.log("Server closed the connection");
        console.log(`Received ${this.packets.length} packets`); 
        this.findMissingSequences(); // Check for any missing sequences
        resolve();
      });

      const oad = Buffer.alloc(2);
      payload.writeUInt8(1, 0); // Call Type 1: Stream All Packets
      payload.writeUInt8(0, 1);
      this.client.write(payload); // Send the request to the server
    });
  }

  parsePacket(data) {
    return {
      symbol: data.toString("ascii", 0, 4), // Extracting the symbol from the packet
      buysellindicator: data.toString("ascii", 4, 5), // Extracting buy/sell indicator
      quantity: data.readInt32BE(5), // Extracting the quantity
      price: data.readInt32BE(9), // Extracting the price
      packetSequence: data.readInt32BE(13), // Extracting the packet sequence number
    };
  }

  findMissingSequences() {
    const sequences = this.packets
      .map((p) => p.packetSequence)
      .sort((a, b) => a - b);
    console.log("Received sequences:", sequences); // Log received sequences
    for (let i = 1; i <= this.highestSequence; i++) {
      if (!sequences.includes(i)) {
        this.missingSequences.add(i); // Add missing sequences to the set
      }
    }
  }

  async requestMissingPackets() {
    for (const seq of this.missingSequences) {
      await this.requestPacket(seq); // Request each missing packet
    }
  }

  async requestPacket(sequence) {
    await this.connect(); // Reconnect for each missing packet
    return new Promise((resolve, reject) => {
      const payload = Buffer.alloc(2);
      payload.writeUInt8(2, 0); // Call Type 2: Resend Packet
      payload.writeUInt8(sequence, 1); // Specify the missing packet sequence

      this.client.once("data", (data) => {
        const packet = this.parsePacket(data); // Parse the received packet
        this.packets.push(packet); // Store the received packet
        this.missingSequences.delete(sequence); // Remove from missing sequences
        this.highestSequence = Math.max(
          this.highestSequence,
          packet.packetSequence
        ); 
        this.client.end(); // Close the connection after receiving the packet
        resolve();
      });

      this.client.write(payload); // Send request for the specific packet
    });
  }

  async writeOutputToFile() {
    try {
      await fs.writeFile("output.json", JSON.stringify(this.packets, null, 2)); // Write packets to output file
      console.log("Output written to output.json");
    } catch (error) {
      console.error("Error writing to file:", error);
    }
  }

  async fetchAllData() {
    try {
      await this.connect(); // Connect to the server
      await this.streamAllPackets(); // Stream all packets
      console.log("Highest sequence number:", this.highestSequence);
      console.log("Missing sequences:", this.missingSequences); 
      await this.requestMissingPackets(); // Request any missing packets
      this.packets.sort((a, b) => a.packetSequence - b.packetSequence);
      console.log("Total packets received:", this.packets.length);
      console.log(
        "Final sequences:",
        this.packets.map((p) => p.packetSequence)
      ); // Log final sequence numbers
      await this.writeOutputToFile(); // Write output to file
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
}

const client = new BetaCrewExchangeClient();
client.fetchAllData(); 
