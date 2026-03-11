class PCMRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.recording = true;
    }

    process(inputs, outputs, parameters) {
        // Get the input data
        const input = inputs[0];
        if (!input || !input[0]) return true;

        // Get the input channel data (Float32Array)
        const inputChannel = input[0];

        // Convert Float32 samples to 16-bit PCM.
        const pcm16 = new Int16Array(inputChannel.length);
        for (let i = 0; i < inputChannel.length; i++) {
            // Multiply by 0x7fff (32767) to scale the float value to 16-bit PCM range.
            const s = Math.max(-1, Math.min(1, inputChannel[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send the audio data to the main thread
        this.port.postMessage(pcm16.buffer);

        return true;
    }
}

registerProcessor("pcm-recorder-processor", PCMRecorderProcessor);
