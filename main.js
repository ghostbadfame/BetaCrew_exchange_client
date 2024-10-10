const net = require("net");
const fs = require("fs").promises;

class BetaCrewExchangeClient {
  constructor(host = "localhost", port = 3000) {
    this.host = host;
    this.port = port;
    this.packetSize = 17;
    this.packets = [];
    this.missingSequences = new Set();
    this.highestSequence = 0;
    this.maxRetries = 3;
  }

  async connect(retries = 0) {
    return new Promise((resolve, reject) => {
      this.client = new net.Socket();
      this.client.connect(this.port, this.host, () => {
        console.log("Connected to server");
        resolve();
      });

      this.client.on("error", (error) => {
        console.error("Connection error:", error);
        if (error.code === 'ECONNREFUSED' && retries < this.maxRetries) {
          console.log(`Retrying connection... Attempt ${retries + 1}/${this.maxRetries}`);
          setTimeout(() => {
            this.connect(retries + 1).then(resolve).catch(reject);
          }, 1000);
        } else {
          if (retries >= this.maxRetries) {
            console.log(`Unable to connect after ${this.maxRetries} attempts. Please check if the server is running and verify the port number: ${this.port}`);
          }
          reject(error);
        }
      });
    });
  }

  async streamAllPackets() {
    return new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);

      this.client.on("data", (data) => {
        console.log("Raw data received:", data);
        buffer = Buffer.concat([buffer, data]);
        while (buffer.length >= this.packetSize) {
          const packet = this.parsePacket(buffer.slice(0, this.packetSize));
          this.packets.push(packet);
          this.highestSequence = Math.max(
            this.highestSequence,
            packet.packetSequence
          );
          buffer = buffer.slice(this.packetSize);
        }
      });

      this.client.on("end", () => {
        console.log("Server closed the connection");
        console.log(`Received ${this.packets.length} packets`); 
        this.findMissingSequences();
        resolve();
      });

      this.client.on("error", (error) => {
        console.error("Data reception error:", error);
        reject(error);
      });

      const payload = Buffer.alloc(2);
      payload.writeUInt8(1, 0); // Call Type 1: Stream All Packets
      payload.writeUInt8(0, 1);
      this.client.write(payload);
    });
  }

  parsePacket(data) {
    return {
      symbol: data.toString("ascii", 0, 4),
      buysellindicator: data.toString("ascii", 4, 5),
      quantity: data.readInt32BE(5),
      price: data.readInt32BE(9),
      packetSequence: data.readInt32BE(13),
    };
  }

  findMissingSequences() {
    const receivedSequences = this.packets.map((p) => p.packetSequence);
    console.log("Received sequences:", receivedSequences);

    for (let i = 1; i <= this.highestSequence; i++) {
      if (!receivedSequences.includes(i)) {
        this.missingSequences.add(i);
      }
    }

    if (this.missingSequences.size > 0) {
      console.log("Missing sequences detected:", Array.from(this.missingSequences));
    } else {
      console.log("No missing sequences detected.");
    }
  }

  async requestMissingPackets() {
    for (const seq of this.missingSequences) {
      await this.requestPacket(seq);
    }
  }

  async requestPacket(sequence) {
    await this.connect();
    return new Promise((resolve, reject) => {
      const payload = Buffer.alloc(2);
      payload.writeUInt8(2, 0); // Call Type 2: Resend Packet
      payload.writeUInt8(sequence, 1);

      this.client.once("data", (data) => {
        const packet = this.parsePacket(data);
        this.packets.push(packet);
        this.missingSequences.delete(sequence);
        this.highestSequence = Math.max(
          this.highestSequence,
          packet.packetSequence
        ); 
        this.client.end();
        resolve();
      });

      this.client.write(payload);
    });
  }

  async writeOutputToFile() {
    try {
      await fs.writeFile("output.json", JSON.stringify(this.packets, null, 2));
      console.log("Output written to output.json");
    } catch (error) {
      console.error("Error writing to file:", error);
    }
  }

  async fetchAllData() {
    try {
      await this.connect();
      await this.streamAllPackets();
      console.log("Highest sequence number:", this.highestSequence);
      console.log("Missing sequences:", this.missingSequences); 
      await this.requestMissingPackets();
      this.packets.sort((a, b) => a.packetSequence - b.packetSequence);
      console.log("Total packets received:", this.packets.length);
      console.log(
        "Final sequences:",
        this.packets.map((p) => p.packetSequence)
      );
      await this.writeOutputToFile();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
}

const client = new BetaCrewExchangeClient();
client.fetchAllData().catch(error => {
  console.error("Error in fetchAllData:", error);
});
