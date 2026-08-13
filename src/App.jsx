import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import Book from './components/Book.jsx'
import Controls from './components/Controls.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import { useBookStore } from './store/useBookStore.js'
import { preloadImageTextures } from './three/imageCache.js'
import { FACES } from './data/compileBook.js'
import { CAMERA_DEFAULT_Z } from './constants.js'

/**
 * One page. One book. No chrome — every control lives in the object itself.
 */
export default function App() {
  const phase = useBookStore((s) => s.phase)
  const setPhase = useBookStore((s) => s.setPhase)

  useEffect(() => {
    let alive = true
    async function preload() {
      try {
        await Promise.all([
          document.fonts.load('600 64px "Playfair Display"'),
          document.fonts.load('italic 600 42px "Playfair Display"'),
          document.fonts.load('400 34px "EB Garamond"'),
          document.fonts.load('italic 400 34px "EB Garamond"'),
          document.fonts.load('600 30px "EB Garamond"'),
        ])
        await document.fonts.ready
      } catch {
        /* system serifs remain a graceful fallback */
      }
      await preloadImageTextures(FACES.flatMap((f) => f.images || []))
      setTimeout(() => alive && setPhase('ready'), 350)
    }
    preload()
    return () => {
      alive = false
    }
  }, [setPhase])

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.35, CAMERA_DEFAULT_Z], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        onPointerMissed={() => {
          const s = useBookStore.getState()
          if (s.focusedImage) s.focusImage(null)
          else if (s.navOpen) s.setNavOpen(false)
        }}
      >
        <color attach="background" args={['#14120f']} />
        <fog attach="fog" args={['#14120f', 9, 16]} />

        {/* soft studio lighting */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[2.5, 3.5, 4]} intensity={1.5} color="#fff2dd" />
        <directionalLight position={[-3, 1.5, 2.5]} intensity={0.4} color="#ccd6ff" />
        <directionalLight position={[-1.5, 2.5, -3]} intensity={0.5} color="#ffe8c8" />

        {phase === 'ready' && (
          <Suspense fallback={null}>
            <Book />
          </Suspense>
        )}
        <Controls />

        {/* grounded contact shadow beneath and around the book */}
        <ContactShadows position={[0, -1.32, 0]} opacity={0.62} scale={7} blur={2.6} far={3.2} resolution={512} color="#000000" />
      </Canvas>
      <LoadingScreen />
    </>
  )
}
