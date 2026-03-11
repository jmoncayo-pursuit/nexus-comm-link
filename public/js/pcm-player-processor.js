/**
 * An audio worklet processor that stores the PCM audio data sent from the main thread
 * to a buffer and plays it.
 */
class PCMPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Init buffer
        this.bufferSize = 24000 * 180; // 24kHz x 180 seconds
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
        this.readIndex = 0;

        // Handle incoming messages from main thread
        this.port.onmessage = (event) => {
            if (event.data.command === "endOfAudio") {
                this.readIndex = this.writeIndex; // Clear the buffer
                return;
            }

            // Decode the base64 data to int16 array.
            const int16Samples = new Int16Array(event.data);
            this._enqueue(int16Samples);
        };
    }

    // Push incoming Int16 data into our ring buffer.
    _enqueue(int16Samples) {
        for (let i = 0; i < int16Samples.length; i++) {
            // Convert 16-bit integer to float in [-1, 1]
            const floatVal = int16Samples[i] / 32768;

            // Store in ring buffer for left channel only (mono)
            this.buffer[this.writeIndex] = floatVal;
            this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

            // Overflow handling (overwrite oldest samples)
            if (this.writeIndex === this.readIndex) {
                this.readIndex = (this.readIndex + 1) % this.bufferSize;
            }
        }
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const framesPerBlock = output[0].length;
        for (let frame = 0; frame < framesPerBlock; frame++) {
            output[0][frame] = this.buffer[this.readIndex]; // left channel
            if (output.length > 1) {
                output[1][frame] = this.buffer[this.readIndex]; // right channel
            }

            if (this.readIndex != this.writeIndex) {
                this.readIndex = (this.readIndex + 1) % this.bufferSize;
            }
        }
        return true;
    }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
