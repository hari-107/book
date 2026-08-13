import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import Book from './components/Book.jsx'
import Controls from './components/Controls.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import BackgroundWorld from './components/BackgroundWorld.jsx'
import FocusedPhoto from './components/FocusedPhoto.jsx'
import { useBookStore } from './store/useBookStore.js'
import { preloadImageTextures } from './three/imageCache.js'
import { FACES } from './data/compileBook.js'
import { CAMERA_DEFAULT_Z, CAMERA_FOV, DESK_Y } from './constants.js'

/**
 * One page. One enormous old adventure book, alive on a desk in the gloom.
 * Every control lives in the object itself; the environment behind it
 * breathes but never upstages the hero.
 */
export default function App() {
  const phase = useBookStore((s) => s.phase)
  const setPhase = useBookStore((s) => s.setPhase)

  useEffect(() => {
    let alive = true
    async function preload() {
      try {
        await Promise.all([
          document.fonts.load('64px "Rye"'),
          document.fonts.load('30px "Special Elite"'),
          document.fonts.load('600 44px "Caveat"'),
          document.fonts.load('700 52px "Caveat"'),
          document.fonts.load('italic 30px "IM Fell English"'),
          document.fonts.load('36px "IM Fell English SC"'),
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
        camera={{ position: [0, 0.16, CAMERA_DEFAULT_Z], fov: CAMERA_FOV }}
        onCreated={({ camera }) => camera.lookAt(0, -0.04, 0)}
        onPointerMissed={() => {
          const s = useBookStore.getState()
          if (s.focusedImage) s.focusImage(null)
          else if (s.navOpen) s.setNavOpen(false)
        }}
      >
        <color attach="background" args={['#100d09']} />
        <fog attach="fog" args={['#100d09', 7, 15]} />

        {/* candlelit study — warm key, cool moonlight fill, ember rim */}
        <ambientLight intensity={0.5} color="#ffe9c4" />
        <directionalLight position={[2.2, 3.2, 3.6]} intensity={1.6} color="#ffdfae" />
        <directionalLight position={[-3, 1.4, 2.4]} intensity={0.35} color="#a9bcdf" />
        <directionalLight position={[-1.2, 2.4, -3]} intensity={0.55} color="#ffca7d" />
        <pointLight position={[1.6, 1.2, 1.8]} intensity={0.5} color="#ffb45e" distance={7} />

        {phase === 'ready' && (
          <Suspense fallback={null}>
            <BackgroundWorld />
            <Book />
            <FocusedPhoto />
          </Suspense>
        )}
        <Controls />

        {/* grounded contact shadow beneath and around the book, on the desk */}
        <ContactShadows position={[0, DESK_Y + 0.004, 0]} opacity={0.7} scale={7} blur={2.2} far={2.4} resolution={512} color="#000000" />
      </Canvas>
      <LoadingScreen />
    </>
  )
}
