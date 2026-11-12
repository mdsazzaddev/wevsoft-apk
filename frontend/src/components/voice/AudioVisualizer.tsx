import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  isRecording: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioContext, sourceNode, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !isRecording) return;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    sourceNode.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient color based on height
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#8b5cf6'); // Purple
        gradient.addColorStop(1, '#3b82f6'); // Blue

        ctx.fillStyle = gradient;
        
        // Draw rounded bar
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, Math.max(2, barHeight), 2);
        ctx.fill();

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
    };
  }, [audioContext, sourceNode, isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={100} 
      height={30} 
      className="w-full h-full object-contain"
    />
  );
};
