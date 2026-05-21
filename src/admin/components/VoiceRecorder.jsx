import { useState, useRef } from 'react';

export default function VoiceRecorder({ onDraftReady, currentDraft }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [context, setContext] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(blob);
      };

      mediaRecorder.start(1000);
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied. Allow microphone in browser settings.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAudio(blob) {
    setTranscribing(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/admin/transcribe', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Transcription failed');
      }
      const data = await res.json();
      setTranscript(data.transcript);
      setShowTranscript(true);
    } catch (err) {
      setError('Transcription failed: ' + err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function generateDraft() {
    if (!transcript) return;
    setDrafting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          context: context || undefined,
          currentDraft: currentDraft || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Draft generation failed');
      }
      const data = await res.json();
      onDraftReady?.(data.draft);
    } catch (err) {
      setError('Draft failed: ' + err.message);
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.row}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={recording ? styles.stopBtn : styles.recordBtn}
          disabled={transcribing || drafting}
          type="button"
        >
          {recording ? '■ Stop' : '● Voice note'}
        </button>

        {transcribing && <span style={styles.status}>Transcribing...</span>}

        {transcript && !transcribing && (
          <>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              style={styles.toggleBtn}
              type="button"
            >
              {showTranscript ? 'Hide' : 'Show'} transcript
            </button>
            <button
              onClick={generateDraft}
              disabled={drafting}
              style={styles.draftBtn}
              type="button"
            >
              {drafting
                ? 'Drafting with AI...'
                : currentDraft && currentDraft.replace(/<[^>]*>/g, '').trim().length > 50
                  ? 'Refine draft with this →'
                  : 'Draft from this →'}
            </button>
          </>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {showTranscript && transcript && (
        <div style={styles.transcriptBox}>
          <p style={styles.transcriptText}>{transcript}</p>
          <input
            type="text"
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Optional: add context (e.g. 'focus on the WAIT practice from chapter 3')"
            style={styles.contextInput}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 8,
    padding: 16, marginBottom: 16,
  },
  row: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  recordBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  stopBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#e74c3c',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  toggleBtn: {
    padding: '6px 14px', fontSize: 13, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
  },
  draftBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#2a5a2a',
    color: '#7dca7d', border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  status: { color: '#a89d91', fontSize: 13 },
  error: { color: '#e74c3c', fontSize: 13, margin: '8px 0 0', },
  transcriptBox: {
    marginTop: 12, padding: 12, background: '#141210', borderRadius: 6,
  },
  transcriptText: {
    color: '#e8e3dc', fontSize: 14, lineHeight: 1.6, margin: 0, marginBottom: 12,
    whiteSpace: 'pre-wrap',
  },
  contextInput: {
    width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #2a2520',
    borderRadius: 6, background: '#1a1816', color: '#e8e3dc', outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};
