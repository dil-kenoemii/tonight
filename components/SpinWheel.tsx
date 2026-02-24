'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import type { Option } from '@/types';

interface SpinWheelProps {
  options: Option[];
  winnerIndex: number;
  winnerText: string;
  winnerParticipantName: string;
  isHost: boolean;
}

export default function SpinWheel({
  options,
  winnerIndex,
  winnerText,
  winnerParticipantName,
  isHost,
}: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(true);
  const [showWinner, setShowWinner] = useState(false);
  const animationStartedRef = useRef(false);
  const router = useRouter();

  // Wheel colors
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B739', // Orange
    '#52B788', // Green
  ];

  useEffect(() => {
    // Prevent animation from restarting on re-renders
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = Math.min(window.innerWidth - 40, 400);
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    // Calculate segment size
    const segmentAngle = (2 * Math.PI) / options.length;

    // Calculate target rotation
    // We want the winner to land at the top (under the pointer at 12 o'clock)
    // In canvas, 0 is right (3 o'clock), and angles go clockwise
    // Top is at 3π/2 (or -π/2), so we need the winner's center there
    const winnerAngle = segmentAngle * winnerIndex + segmentAngle / 2;
    const topPosition = (3 * Math.PI) / 2; // 12 o'clock position
    const targetRotation = (topPosition - winnerAngle) % (2 * Math.PI);

    // Add 5 full spins
    const totalRotation = 5 * 2 * Math.PI + targetRotation;

    // Animation duration (5 seconds for host, 3 seconds for participants)
    const duration = isHost ? 5000 : 3000;
    const startTime = Date.now();
    let animationComplete = false;

    // Audio context for ticking sound
    let audioContext: AudioContext | null = null;
    let lastTickTime = 0;
    const tickInterval = 50; // Tick every 50ms initially

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Audio not supported');
    }

    const playTick = () => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    };

    const drawWheel = (rotation: number) => {
      ctx.clearRect(0, 0, size, size);

      // Draw segments
      for (let i = 0; i < options.length; i++) {
        const startAngle = rotation + i * segmentAngle;
        const endAngle = startAngle + segmentAngle;

        // Check if this is the winning segment (when animation is complete)
        const isWinningSegment = animationComplete && i === winnerIndex;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = isWinningSegment ? '#FFD700' : colors[i % colors.length]; // Gold for winner
        ctx.fill();
        ctx.strokeStyle = isWinningSegment ? '#FFD700' : '#ffffff';
        ctx.lineWidth = isWinningSegment ? 5 : 3;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;

        // Truncate long text
        let text = options[i].text;
        if (text.length > 20) {
          text = text.substring(0, 17) + '...';
        }

        ctx.fillText(text, radius - 20, 5);
        ctx.restore();
      }

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw pointer at top (pointing down)
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX - 15, 40);
      ctx.lineTo(centerX + 15, 40);
      ctx.closePath();
      ctx.fillStyle = '#FF4444';
      ctx.fill();
      ctx.strokeStyle = '#CC0000';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = eased * totalRotation;

      drawWheel(currentRotation);

      // Play tick sound
      if (audioContext && now - lastTickTime > tickInterval * (1 - eased * 0.8)) {
        playTick();
        lastTickTime = now;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spin complete - mark as done and keep drawing
        animationComplete = true;
        drawWheel(totalRotation);
        setIsSpinning(false);

        // Keep redrawing to show the gold highlight
        let stoppedFrames = 0;
        const drawStopped = () => {
          drawWheel(totalRotation);
          stoppedFrames++;
          if (stoppedFrames < 60) { // Draw for ~1 second at 60fps
            requestAnimationFrame(drawStopped);
          }
        };
        requestAnimationFrame(drawStopped);

        // Wait 1 second, then show confetti and winner
        setTimeout(() => {
          // Fire confetti
          const duration = 3000;
          const end = Date.now() + duration;

          const frame = () => {
            confetti({
              particleCount: 3,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 1 },
              colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#F7DC6F'],
            });
            confetti({
              particleCount: 3,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 1 },
              colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#F7DC6F'],
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          };
          frame();

          // Show winner text
          setShowWinner(true);
        }, 1000);
      }
    };

    animate();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [options, winnerIndex, isHost]);

  const handleNewRound = () => {
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full">
        {/* Canvas */}
        <div className="flex justify-center mb-6">
          <canvas
            ref={canvasRef}
            className="rounded-full shadow-2xl"
          />
        </div>

        {/* Winner Display */}
        {showWinner && (
          <div className="bg-white rounded-lg shadow-xl p-8 text-center animate-fadeIn">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Winner!
            </h2>
            <p className="text-2xl font-semibold text-blue-600 mb-2">
              {winnerText}
            </p>
            <p className="text-gray-600 mb-6">
              Suggested by {winnerParticipantName}
            </p>
            <button
              onClick={handleNewRound}
              className="w-full h-14 bg-gradient-to-r from-green-400 to-teal-500 text-white font-bold text-xl rounded-lg hover:shadow-xl transition-all duration-200"
            >
              New Round
            </button>
          </div>
        )}

        {/* Spinning text */}
        {isSpinning && (
          <div className="text-center">
            <p className="text-white text-2xl font-bold animate-pulse">
              Spinning...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
