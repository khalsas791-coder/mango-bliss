import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float, useScroll } from '@react-three/drei';
import * as THREE from 'three';

interface MangoShakeModelProps {
  color?: string;
  topping?: 'mango' | 'pistachio' | 'chocolate';
}

export function MangoShakeModel({ color = '#fbbf24', topping = 'mango', staticMode = false }: MangoShakeModelProps & { staticMode?: boolean }) {
  const scroll = staticMode ? { offset: 0 } : useScroll();
  const groupRef = useRef<THREE.Group>(null);
  const iceCubesRef = useRef<THREE.Group>(null);
  const bubblesRef = useRef<THREE.Group>(null);

  // Dynamic Lighting based on time
  const timeLighting = useMemo(() => {
    const hour = new Date().getHours();
    // 6-10: Morning (Bright, Cool)
    // 10-16: Day (Neutral, High Intensity)
    // 16-20: Golden Hour (Warm, Low Angle)
    // 20-6: Night (Dim, Blueish)
    
    if (hour >= 6 && hour < 10) return { ambient: 0.6, point: 1.2, color: '#fff9e6' };
    if (hour >= 10 && hour < 16) return { ambient: 0.5, point: 1.5, color: '#ffffff' };
    if (hour >= 16 && hour < 20) return { ambient: 0.4, point: 1.8, color: '#ffcc66' };
    return { ambient: 0.3, point: 0.8, color: '#b3c6ff' };
  }, []);

  // Generate random positions for ice cubes
  const iceCubes = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 6
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
      scale: 0.1 + Math.random() * 0.2
    }));
  }, []);

  // Generate bubbles
  const bubbles = useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 1.2
      ] as [number, number, number],
      speed: 0.01 + Math.random() * 0.02,
      scale: 0.02 + Math.random() * 0.05
    }));
  }, []);

  useFrame((state, delta) => {
    const offset = scroll.offset; // 0 to 1
    
    if (staticMode && groupRef.current) {
      // Slow auto-rotation in static mode
      groupRef.current.rotation.y += delta * 0.3;
      // Fixed tilt as requested
      groupRef.current.rotation.z = -0.2;
      groupRef.current.rotation.x = 0.1;
      groupRef.current.position.set(0, 0, 0);
      // Slightly smaller scale to ensure it doesn't go off-screen
      groupRef.current.scale.setScalar(1.0);
      return;
    }

    if (groupRef.current) {
      // Section 1: Hero (0 to 0.2)
      // Section 2: Benefits (0.2 to 0.4)
      // Section 3: Ingredients (0.4 to 0.6)
      // Section 4: Nutrition (0.6 to 0.8)
      // Section 5: CTA (0.8 to 1.0)

      // Position and Rotation based on scroll
      if (offset < 0.2) {
        // Hero: Center and rotate
        const t = offset * 5;
        groupRef.current.position.x = THREE.MathUtils.lerp(-5, 0, t);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0.5, 0, t);
        groupRef.current.position.y = 0;
        groupRef.current.scale.setScalar(1);
      } else if (offset < 0.4) {
        // Benefits: Tilt and move to right
        const t = (offset - 0.2) * 5;
        groupRef.current.position.x = THREE.MathUtils.lerp(0, 2.5, t);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0, -0.6, t);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(0, Math.PI / 4, t);
        groupRef.current.position.y = 0;
      } else if (offset < 0.6) {
        // Ingredients: Move to left and tilt forward
        const t = (offset - 0.4) * 5;
        groupRef.current.position.x = THREE.MathUtils.lerp(2.5, -2.5, t);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(-0.6, 0.3, t);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.6, t);
        groupRef.current.position.y = 0;
      } else if (offset < 0.8) {
        // Nutrition: Drop down and center
        const t = (offset - 0.6) * 5;
        groupRef.current.position.x = THREE.MathUtils.lerp(-2.5, 0, t);
        groupRef.current.position.y = THREE.MathUtils.lerp(0, -1.5, t);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(0.6, 0, t);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(0.3, 0, t);
        groupRef.current.scale.setScalar(1);
      } else {
        // CTA: Scale up and center
        const t = (offset - 0.8) * 5;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(1, 1.8, t));
        groupRef.current.position.y = THREE.MathUtils.lerp(-1.5, 0, t);
        groupRef.current.position.x = 0;
      }

      // Continuous subtle rotation
      groupRef.current.rotation.y += 0.005;
    }

    // Animate ice cubes
    if (iceCubesRef.current) {
      iceCubesRef.current.children.forEach((child, i) => {
        child.position.y += Math.sin(state.clock.elapsedTime + i) * 0.005;
        child.rotation.x += 0.01;
        child.rotation.y += 0.01;
      });
      
      // Ice cubes visibility based on scroll (splash effect around section 2)
      const iceOpacity = offset > 0.1 && offset < 0.5 ? 1 : 0;
      iceCubesRef.current.visible = iceOpacity > 0;
    }

    // Animate bubbles
    if (bubblesRef.current) {
      bubblesRef.current.children.forEach((child, i) => {
        const bubble = bubbles[i];
        child.position.y += bubble.speed;
        // Reset bubble to bottom if it goes too high
        if (child.position.y > 1.3) {
          child.position.y = -1.5;
          child.position.x = (Math.random() - 0.5) * 1.2;
          child.position.z = (Math.random() - 0.5) * 1.2;
        }
        // Subtle horizontal wobble
        child.position.x += Math.sin(state.clock.elapsedTime * 2 + i) * 0.002;
      });
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group>
          {/* Glass Body */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[1, 0.7, 3, 32]} />
            <meshPhysicalMaterial
              transparent
              opacity={0.3}
              transmission={0.9}
              thickness={0.5}
              roughness={0.1}
              color="#ffffff"
            />
          </mesh>

          {/* Shake Liquid */}
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.95, 0.65, 2.8, 32]} />
            <MeshDistortMaterial
              color={color}
              speed={2}
              distort={0.2}
              roughness={0.2}
            />
          </mesh>

          {/* Bubbles */}
          <group ref={bubblesRef}>
            {bubbles.map((bubble, i) => (
              <mesh key={i} position={bubble.position} scale={bubble.scale}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshPhysicalMaterial
                  transparent
                  opacity={0.6}
                  transmission={1}
                  thickness={0.1}
                  color={color}
                />
              </mesh>
            ))}
          </group>

          {/* Whipped Cream Top */}
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.9, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>

          {/* Toppings */}
          {topping === 'mango' && (
            <group>
              <mesh position={[0.4, 1.6, 0.2]} rotation={[0.4, 0.2, 0.5]}>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
              <mesh position={[-0.3, 1.7, -0.1]} rotation={[0.1, 0.5, 0.2]}>
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
            </group>
          )}

          {topping === 'pistachio' && (
            <group>
              {Array.from({ length: 8 }).map((_, i) => (
                <mesh 
                  key={i} 
                  position={[Math.sin(i) * 0.5, 1.6 + Math.random() * 0.2, Math.cos(i) * 0.5]} 
                  rotation={[Math.random(), Math.random(), Math.random()]}
                >
                  <sphereGeometry args={[0.05, 8, 8]} scale={[1, 1.5, 1]} />
                  <meshStandardMaterial color="#84cc16" />
                </mesh>
              ))}
            </group>
          )}

          {topping === 'chocolate' && (
            <group>
               <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.6, 0.05, 16, 32]} />
                <meshStandardMaterial color="#451a03" roughness={0.1} />
              </mesh>
              <mesh position={[0, 1.7, 0]} rotation={[Math.PI / 2, 0, 0.5]}>
                <torusGeometry args={[0.4, 0.04, 16, 32]} />
                <meshStandardMaterial color="#451a03" roughness={0.1} />
              </mesh>
            </group>
          )}

          {/* Straw */}
          <mesh position={[0.3, 1.2, -0.3]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </group>
      </Float>

      {/* Ice Cubes Group */}
      <group ref={iceCubesRef}>
        {iceCubes.map((cube, i) => (
          <mesh key={i} position={cube.position} rotation={cube.rotation} scale={cube.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
              transparent
              opacity={0.4}
              transmission={0.9}
              thickness={1}
              roughness={0}
              color="#ffffff"
            />
          </mesh>
        ))}
      </group>

      <ambientLight intensity={timeLighting.ambient} />
      <pointLight position={[10, 10, 10]} intensity={timeLighting.point} color={timeLighting.color} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={timeLighting.point * 0.8} color={timeLighting.color} />
    </group>
  );
}
