import { useState, useRef } from 'react'

export default function App() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState("id-en"); // "id-en" or "en-id"
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = processAudio;
    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setSourceText("Listening...");
    setTargetText("");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    setSourceText("Processing speech...");

    try {
      // Step 1: Transcribe
      const res1 = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData
      });
      const data1 = await res1.json();
      const transcribed = data1.original_text;
      setSourceText(transcribed);

      // Step 2: Translate
      setTargetText("Translating...");
      const srcLang = mode === "id-en" ? "id" : "en";
      const tgtLang = mode === "id-en" ? "en" : "id";
      
      const res2 = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcribed, source_lang: srcLang, target_lang: tgtLang })
      });
      const data2 = await res2.json();
      setTargetText(data2.translated_text);

    } catch (err) {
      console.error(err);
      setSourceText("Error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Voice Translator</h1>
        
        <div className="flex justify-center gap-4">
          <button 
            className={`px-4 py-2 rounded ${mode === 'id-en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('id-en')}>ID -> EN</button>
          <button 
            className={`px-4 py-2 rounded ${mode === 'en-id' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('en-id')}>EN -> ID</button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            <h2 className="text-sm text-gray-500 mb-2">Original Text ({mode.split('-')[0].toUpperCase()})</h2>
            <p className="text-lg">{sourceText}</p>
          </div>
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            <h2 className="text-sm text-gray-500 mb-2">Translation ({mode.split('-')[1].toUpperCase()})</h2>
            <p className="text-lg">{targetText}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`w-32 h-32 rounded-full text-white font-bold text-xl transition-all ${isRecording ? 'bg-red-600 scale-110' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {isRecording ? 'Release' : 'Hold'}
          </button>
        </div>
      </div>
    </div>
  )
}
