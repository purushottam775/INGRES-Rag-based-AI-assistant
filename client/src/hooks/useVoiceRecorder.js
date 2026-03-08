import { useState, useRef, useCallback } from 'react';

export function useVoiceRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);

    const startRecording = useCallback(async () => {
        try {
            chunks.current = [];
            setAudioBlob(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start();
            mediaRecorder.current = recorder;
            setIsRecording(true);
        } catch (err) {
            console.error('Microphone access denied:', err);
            alert('Microphone access is required for voice input.');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    }, []);

    const clearAudio = useCallback(() => setAudioBlob(null), []);

    return { isRecording, audioBlob, startRecording, stopRecording, clearAudio };
}
