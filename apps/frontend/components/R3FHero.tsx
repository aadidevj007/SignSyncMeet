'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF } from '@react-three/drei'
import { Mesh, Vector3 } from 'three'
import * as THREE from 'three'

// Hand model component
function HandModel({ position, rotation, scale }: { position: [number, number, number], rotation: [number, number, number], scale: number }) {
  const meshRef = useRef<Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      
      // Subtle rotation
      meshRef.current.rotation.y = rotation[1] + Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  // Create a simple hand geometry
  const handGeometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.1)
    const finger1 = new THREE.BoxGeometry(0.1, 0.3, 0.05)
    const finger2 = new THREE.BoxGeometry(0.1, 0.3, 0.05)
    const finger3 = new THREE.BoxGeometry(0.1, 0.3, 0.05)
    const finger4 = new THREE.BoxGeometry(0.1, 0.3, 0.05)
    const thumb = new THREE.BoxGeometry(0.1, 0.2, 0.05)
    
    return { geometry, finger1, finger2, finger3, finger4, thumb }
  }, [])

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      {/* Palm */}
      <mesh geometry={handGeometry.geometry}>
        <meshStandardMaterial color="#3b82f6" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Fingers */}
      <mesh position={[0.1, 0.2, 0]} geometry={handGeometry.finger1}>
        <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.2, 0]} geometry={handGeometry.finger2}>
        <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]} geometry={handGeometry.finger3}>
        <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[-0.05, 0.2, 0]} geometry={handGeometry.finger4}>
        <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Thumb */}
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 4]} geometry={handGeometry.thumb}>
        <meshStandardMaterial color="#60a5fa" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Floating particles
function Particles({ count = 100 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  const particles = useMemo(() => {
    const temp = new THREE.Object3D()
    const positions = []
    
    for (let i = 0; i < count; i++) {
      positions.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ],
        scale: Math.random() * 0.5 + 0.1
      })
    }
    
    return positions
  }, [count])
  
  useFrame((state) => {
    if (meshRef.current) {
      particles.forEach((particle, i) => {
        temp.position.set(...particle.position as [number, number, number])
        temp.scale.setScalar(particle.scale)
        temp.rotation.y = state.clock.elapsedTime * 0.5 + i
        temp.updateMatrix()
        meshRef.current!.setMatrixAt(i, temp.matrix)
      })
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })
  
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02]} />
      <meshStandardMaterial color="#8b5cf6" transparent opacity={0.6} />
    </instancedMesh>
  )
}

// Main scene component
function Scene() {
  const groupRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation of the entire scene
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[10, -10, 5]} intensity={0.5} color="#8b5cf6" />
      
      {/* Hand models */}
      <HandModel position={[-2, 0, 0]} rotation={[0, Math.PI / 4, 0]} scale={1} />
      <HandModel position={[2, 0, 0]} rotation={[0, -Math.PI / 4, 0]} scale={1} />
      <HandModel position={[0, 2, 0]} rotation={[0, 0, 0]} scale={0.8} />
      
      {/* Floating particles */}
      <Particles count={50} />
      
      {/* Background elements */}
      <mesh position={[0, 0, -5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.1} />
      </mesh>
    </group>
  )
}

export default function R3FHero() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <Scene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
