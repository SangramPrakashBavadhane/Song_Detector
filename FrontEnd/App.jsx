import React, { useState, useRef, useEffect } from 'react';

const TARGET_SAMPLE_RATE = 44100;

const RECORD_DURATION_MS = 5000;

const API_ENDPOINT = '/api/identify';
export default function App() {

  const [status, setStatus] = useState('idle'); //idle,listening,analysing,success,-no-match
  const [timer, setTimer] = useState(0.0);
  const [isRecording, setIsRecording] = useState(false);
  const [matchResult, setMatchResult] = useState({
    title: "Mock Song Title",
    artist: "Mock artist",
    score: 95,
    offset: 12.4
  })


  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  const scriptNodeRef = useRef(null);
  const analyserRef = useRef(null);

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const audioBufferRef = useRef([]);

  useEffect(() => {
    return () => cleanupAudio();
  }, []);


  useEffect(() => {
    let interval = null;
    if (isRecording) {
      const startTime = Date.now();

      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimer(elapsed);
        if (elapsed * 1000 >= RECORD_DURATION_MS) {
          stopRecordingAndIdentify();
        }
      }, 100)
    }
    else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRecording]);


  const handleRecordClick = () => {
    if (status === 'idle') {
      startRecording(); // <-- Calls the function that requests microphone permission!
    } else if (status === 'listening') {
      setIsRecording(false);
      cleanupAudio();
      setStatus('analysing');
      // Simulate analysis completing after 1 second
      setTimeout(() => {
        setStatus('success');
      }, 1000);
    }
  };


  const handleReset = () => {
    setStatus('idle');
  };

  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasCtx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // Keep requesting animation frames while recording
      animationFrameRef.current = requestAnimationFrame(draw);


      // Grab the current time-domain (waveform) data
      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear the canvas with a dark background
      canvasCtx.fillStyle = 'white';
      canvasCtx.fillRect(0, 0, width, height);

      // 2. Set up drawing styles for a neon cyan glow wave
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = 'blue';
      canvasCtx.shadowBlur = 4;
      canvasCtx.shadowColor = 'blue';
      canvasCtx.beginPath();

      // 3. Calculate visual scaling
      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Normalize 0-255 range to 0.0-2.0, where 1.0 is center
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i == 0) {
          canvasCtx.moveTo(x, y);
        }
        else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      //Finish drawing the line
      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();

    }

    draw();

  }

  const startRecording = async () => {
    try {
      // 1. Reset buffer and set recording states
      audioBufferRef.current = [];
      setIsRecording(true);
      setStatus('listening');
      setTimer(0.0);
      setMatchResult(null);

      // 2. Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true       // normalizes volume
        },
        video: false
      });
      streamRef.current = stream;

      // 3. Initialize AudioContext
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // 4. Create source node from mic stream
      const source = audioCtx.createMediaStreamSource(stream);

      // 5. Setup Analyser Node for visualizer
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      // 6. Start the visualizer canvas loop
      startVisualizer();

      // 7. Setup ScriptProcessorNode to capture raw float samples
      const bufferSize = 2048;
      // 1 input channel (mono), 1 output channel
      const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      scriptNodeRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        // Capture raw audio floats from Channel 0 (Mono)
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy the floats into our buffer ref
        audioBufferRef.current.push(...inputData);
      };

      // Connect nodes: source -> scriptNode -> destination (speakers)
      // Note: We connect to destination so the onaudioprocess events keep firing,
      // but we aren't sending sound to the speakers because scriptNode doesn't output anything.
      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

    } catch (error) {
      console.error('Mic access failed: ', error);
      setStatus('idle');
      setIsRecording(false);
      alert('Could not start recording. Please make sure microphone permission is allowed.');
    }
  };

  const stopRecordingAndIdentify = async () => {
    setIsRecording(false);

    const originalSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 48000;


    cleanupAudio();
    setStatus('analysing');
    // We will build the downsampling, WAV encoding, and upload logic here next!
    if (audioBufferRef.current.length === 0) {
      console.warn("No audio data was captured.");

      setStatus('idle');
      return;
    }

    try {
      console.log(`Original recording samplerate: ${originalSampleRate}Hz. Total samples: ${audioBufferRef.current.length}`);
      const downsampledSamples = downsample(audioBufferRef.current, originalSampleRate, TARGET_SAMPLE_RATE);
      console.log(`Downsampled to ${TARGET_SAMPLE_RATE}Hz. New total samples: ${downsampledSamples.length}`);

      // 4. Encode the downsampled Float32 values into a 16-bit PCM WAV Blob
      const wavBlob = encodeWAV(downsampledSamples, TARGET_SAMPLE_RATE);
      console.log(`Audio successfully encoded to WAV file. Size: ${wavBlob.size} bytes`);

      // 5. Upload the WAV file to the Java backend
      const result = await uploadAudio(wavBlob);

      // 6. Handle the match results from the server
      if (result && result.title) {
        setMatchResult(result);
        setStatus('success');
      } else {
        setStatus('no-match');
      }

    } catch (error) {
      console.error("Identification failed:", error);
      triggerMockFallback();
    }

  };

  const downsample = (buffer, fromRate, toRate) => {
    if (fromRate == toRate) {
      return new Float32Array(buffer);
    }
    const sampleRateRatio = fromRate / toRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = i * sampleRateRatio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(buffer.length - 1, indexFloor + 1);
      const weight = index - indexFloor;

      //linearly interpolate between the two neighbouring samples.
      result[i] = buffer[indexFloor] * (1 - weight) + buffer[indexCeil] * weight;

    }

    return result;


  };

  const encodeWAV = (samples, sampleRate) => {
    // 16-bit PCM WAV has a 44-byte header + 2 bytes per audio sample
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    //Write WAV Header
    //"RIFF" chunk descriptor
    view.setUint8(0, 82);  // R
    view.setUint8(1, 73);  // I
    view.setUint8(2, 70);  // F
    view.setUint8(3, 70);  // F

    // File size minus 8 bytes
    view.setUint32(4, 36 + samples.length * 2, true);

    //"WAVE" chunk
    view.setUint8(8, 87);  // W
    view.setUint8(9, 65);  // A
    view.setUint8(10, 86); // V
    view.setUint8(11, 69); // E

    //"fmt" sub-chunk
    view.setUint8(12, 102); // f
    view.setUint8(13, 109); // m
    view.setUint8(14, 116); // t
    view.setUint8(15, 32); // space

    // Subchunk size (16 for PCM)
    view.setUint32(16, 16, true);
    // Audio format (1 = PCM)
    view.setUint16(20, 1, true);
    // Number of channels (1 = Mono)
    view.setUint16(22, 1, true);
    // Sample Rate
    view.setUint32(24, sampleRate, true);
    // Byte Rate (sampleRate * channels * bytesPerSample)
    view.setUint32(28, sampleRate * 2, true);
    // Block Align (channels * bytesPerSample = 2)
    view.setUint16(32, 2, true);
    // Bits per sample (16 bits)
    view.setUint16(34, 16, true);

    // "data" subchunk header
    view.setUint8(36, 100); // d
    view.setUint8(37, 97);  // a
    view.setUint8(38, 116); // t
    view.setUint8(39, 97);  // a

    view.setUint32(40, samples.length * 2, true);

    // Write the PCM audio samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      //Clamp the sample value between -1.0 and 1.0
      const s = Math.max(-1, Math.min(1, samples[i]));
      //Map float range (-1.0 to 1.0) to 16bit short range (-32768 to 32767)
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      //write 16-bit signed integer (little-endian)
      view.setInt16(offset, val, true);
    }

    return new Blob([view], { type: 'audio/wav' });


  }

  const uploadAudio = async (wavBlob) => {
    const formdata = new FormData();
    // 'file' is the key name that the Java backend will look for in the POST request

    formdata.append('file', wavBlob, 'recording.wav');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formdata,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status ${response.status}`);

    }

    //parse and return the JSON response from the server
    const data = await response.json();
    return data;


  }

  const triggerMockFallback = () => {
    console.warn("Backend server is offline. Triggering mock fallback match result");
    setMatchResult({
      title: "temp",
      artist: "temp",
      score: 98,
      offset: 45
    });
    setStatus('success');
  }

  const cleanupAudio = () => {

    // 1. Stop the visualizer animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }


    // 2. Disconnect the script processor node
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }

    // 3. Stop the media stream track
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 4. Close the AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }



    const canvas = canvasRef.current;

    if (canvas) {
      const canvasCtx = canvas.getContext('2d');
      canvasCtx.fillStyle = 'white';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = 'blue';
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, canvas.height / 2);
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

    }

  }


  return (
    <div>
      <header>
        <h1>Shazam</h1>
        <p>a self contained music fingerprinting and identification client.</p>
      </header>

      <section>
        <div>
          {/* Canvas placeholder where live waves will be drawn */}
          <canvas ref={canvasRef}
            width="500"
            height="120"
            style={{ border: '2px solid black', background: '#ccc', display: 'block', margin: '10px auto' }}
          />
        </div>
      </section>

      <section>
        <div>
          {status === 'idle' && (
            <button onClick={handleRecordClick}>start scanning</button>
          )}
          {status === 'listening' && (
            <div>
              <button onClick={handleRecordClick}>Stop and Identify</button>
              <p>Listening...  Time:{timer.toFixed(1)}s</p>
            </div>
          )}
          {status == 'analysing' && (
            <p>Analysing Audio...</p>
          )}
        </div>
      </section>

      <section>
        {status === 'success' && matchResult && (
          <div style={{ border: '1px dashed green', padding: '15px', marginTop: '20px' }}>
            <h3>Song Identified!</h3>
            <p>Title: {matchResult.title}</p>
            <p>Artist: {matchResult.artist}</p>
            <p>Similarity Score: {matchResult.score}%</p>
            <p>Offset Match: {matchResult.offset}s</p>
            <button onClick={() => setStatus('idle')}>Scan Another</button>
          </div>
        )}
        {status === 'no-match' && (
          <div style={{ border: '1px dashed red', padding: '15px', marginTop: '20px' }}>
            <h3>No Match Found</h3>
            <button onClick={() => setStatus('idle')}>Try Again</button>
          </div>)}
      </section>



    </div>
  )
}