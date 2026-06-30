import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  scene1: 5500,
  scene2: 8000,
  scene3: 7000,
  scene4: 6500,
  scene5: 8000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  scene1: Scene1,
  scene2: Scene2,
  scene3: Scene3,
  scene4: Scene4,
  scene5: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const patternPos = [
  { x: '-10vw', y: '-10vh', scale: 1.2, opacity: 0.15, rotate: 0 },
  { x: '10vw', y: '20vh', scale: 1.5, opacity: 0.1, rotate: 15 },
  { x: '-5vw', y: '10vh', scale: 1.1, opacity: 0.2, rotate: -5 },
  { x: '5vw', y: '-15vh', scale: 1.4, opacity: 0.12, rotate: 10 },
  { x: '0vw', y: '0vh', scale: 1, opacity: 0.08, rotate: 0 },
];

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)]">
        {/* Persistent Background Layer */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div className="absolute w-[80vw] h-[80vw] rounded-full opacity-30 blur-[100px]"
            style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
            animate={{ x: ['-20%', '30%', '-10%'], y: ['-10%', '20%', '-20%'], scale: [1, 1.2, 0.9] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute w-[60vw] h-[60vw] rounded-full opacity-20 blur-[80px] right-0 bottom-0"
            style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent)' }}
            animate={{ x: ['10%', '-30%', '20%'], y: ['20%', '-10%', '10%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
          <div
            className="absolute inset-0 opacity-10 mix-blend-overlay bg-cover bg-center"
            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/texture-woven.png)` }}
          />
        </div>

        {/* Persistent Midground Layer */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center mix-blend-color-dodge pointer-events-none"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/texture-pattern.png)` }}
          animate={patternPos[sceneIndex] ?? patternPos[0]}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Persistent Accent Line */}
        <motion.div
          className="absolute h-[2px] bg-[var(--color-primary)] z-20 pointer-events-none"
          animate={{
            left: ['0%', '10%', '0%', '20%', '0%'][sceneIndex] ?? '0%',
            width: ['0%', '30%', '40%', '15%', '100%'][sceneIndex] ?? '0%',
            top: ['50%', '80%', '20%', '85%', '95%'][sceneIndex] ?? '50%',
            opacity: sceneIndex === 0 ? 0 : 0.8,
          }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Scene Content */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
