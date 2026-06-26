import React, { useState, useRef } from 'react';

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

  const startRecording = async () => {
    try {

      audioBufferRef.current = [];
      setIsRecording(true);
      setStatus('listening');
      setTimer(0.0);
      setMatchResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSupression: true,
          autoGainControl: true       // normalizes volume
        },
        video: false
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      const analyser = audioCtx.createAnalyser();
      analyser.fftsize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const buffersize = 2048;
      const scriptNode = audioCtx.createScriptProcessor(buffersize, 1, 1);
      scriptNodeRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        if (!isRecording) return;

        const inputdata = e.inputBuffer.getChannelData(0);
        audioBufferRef.current.push(...inputdata);

      };

      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);



    } catch (error) {
      console.error('Mic acces failed: ', error);
      setStatus('idle');
      setIsRecording(false);
      alert('could not start recording .Please make sure microphone permission is allowed.')

    }


  }

  const cleanupAudio = () => {

    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
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
          <canvas
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