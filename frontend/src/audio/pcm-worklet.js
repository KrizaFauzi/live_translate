class Pcm16Processor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frame = new Int16Array(1600) // 100 ms of mono 16 kHz PCM
    this.offset = 0
  }

  process(inputs) {
    const input = inputs[0]
    const channel = input && input[0]
    if (!channel || channel.length === 0) return true

    const outputSampleRate = 16000
    const ratio = sampleRate / outputSampleRate
    const outputLength = Math.floor(channel.length / ratio)
    if (outputLength <= 0) return true

    for (let index = 0; index < outputLength; index += 1) {
      const start = Math.floor(index * ratio)
      const end = Math.min(Math.floor((index + 1) * ratio), channel.length)
      let total = 0
      for (let sourceIndex = start; sourceIndex < end; sourceIndex += 1) total += channel[sourceIndex]
      const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)))
      this.frame[this.offset] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      this.offset += 1
      if (this.offset === this.frame.length) {
        this.port.postMessage(this.frame.buffer, [this.frame.buffer])
        this.frame = new Int16Array(1600)
        this.offset = 0
      }
    }
    return true
  }
}

registerProcessor('pcm16-processor', Pcm16Processor)
