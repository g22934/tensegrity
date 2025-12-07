import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Cylinder } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import * as math from 'mathjs';
import { Text, Billboard } from '@react-three/drei';


function App() {
  const { rad, x } = useControls({
    rad: { value: 3, min: 0, max: 15, step: 0.1 },
    x: { value: 0, min: -5, max: 15, step: 0.1 },
  });

  const A = math.matrix([[0, 1, 0], [0, 0, -1], [-1, 0, 0]]);
  const B = math.matrix([[1, 0, 0], [0, -1, 0], [0, 0, -1]]);
  const C = math.matrix([[-1, 0, 0], [0, 1, 0], [0, 0, -1]]);

  const mats = [];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 2; b++) {
      for (let c = 0; c < 2; c++) {
        mats.push(
          math.multiply(
            math.multiply(math.pow(A, a), math.pow(B, b)),
            math.pow(C, c)
          )
        );
      }
    }
  }

function Vertex({ xyz, index }) {
  return (
    <group position={xyz}>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="red" />
      </mesh>

      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, 1.2, 0]}
          fontSize={1.2}
          color="white"
          outlineColor="black"
          outlineWidth={0.05}
          anchorX="center"
          anchorY="middle"
        >
          {index}
        </Text>
      </Billboard>
    </group>
  );
}


function Vertices({ x0 }) {
  const points = mats.map((m) => math.multiply(m, math.matrix(x0)));
  return points.map((pt, i) => (
    <Vertex key={i} xyz={pt.valueOf()} index={i + 1} />
  ));
}



  function StrawFrom({ x0, color = 'orange' }) {
    const to = math.multiply(A, math.matrix(x0));
    return <CylinderBetween start={x0} end={to.valueOf()} radius={0.2} color={color} />;
  }

  function StrawFromM({ x0, M, color = 'orange' }) {
    const to = math.multiply(math.multiply(M, A), math.matrix(x0));
    const from = math.multiply(M, math.matrix(x0));
    return <CylinderBetween start={from.valueOf()} end={to.valueOf()} radius={0.2} color={color} />;
  }

  function Triangle({ M, x0, color }) {
    const p1 = math.multiply(M, math.matrix(x0)).valueOf();
    const p2 = math.multiply(math.multiply(M, A), math.matrix(x0)).valueOf();
    const p3 = math.multiply(math.multiply(M, math.pow(A, 2)), math.matrix(x0)).valueOf();

    return (
      <>
        <CylinderBetween start={p1} end={p2} radius={0.2} color={color} />
        <CylinderBetween start={p2} end={p3} radius={0.2} color={color} />
        <CylinderBetween start={p3} end={p1} radius={0.2} color={color} />
      </>
    );
  }

  function Straws({ x0 }) {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];
    return mats.map((M, i) => <Triangle key={i} M={M} x0={x0} color={colors[i % colors.length]} />);
  }

  function Gom1({ x0, M, color = 'black' }) {
    const G1 = math.multiply(A, B);
    const to = math.multiply(math.multiply(M, G1), math.matrix(x0));
    const from = math.multiply(M, math.matrix(x0));
    return <CylinderBetween start={from.valueOf()} end={to.valueOf()} radius={0.05} color={color} />;
  }

  function Goms1({ x0 }) {
    return mats.map((M, i) => <Gom1 key={i} x0={x0} M={M} />);
  }

  function Gom2({ x0, M, color = 'black' }) {
    const G2 = math.multiply(A, C);
    const to = math.multiply(math.multiply(M, G2), math.matrix(x0));
    const from = math.multiply(M, math.matrix(x0));
    return <CylinderBetween start={from.valueOf()} end={to.valueOf()} radius={0.05} color={color} />;
  }

  function Goms2({ x0 }) {
    return mats.map((M, i) => <Gom2 key={i} x0={x0} M={M} />);
  }

  function CylinderBetween({ start, end, radius = 0.02, color = 'orange' }) {
    const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
    const endVec = useMemo(() => new THREE.Vector3(...end), [end]);

    const mid = useMemo(() => startVec.clone().add(endVec).multiplyScalar(0.5), [startVec, endVec]);
    const dir = useMemo(() => endVec.clone().sub(startVec), [startVec, endVec]);
    const length = dir.length();

    const orientation = useMemo(() => {
      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(axis, dir.clone().normalize());
      return quaternion;
    }, [dir]);

    return (
      <Cylinder args={[radius, radius, length, 16]} position={mid} quaternion={orientation}>
        <meshStandardMaterial color={color} />
      </Cylinder>
    );
  }

  const p0 = [0, 7.07, 7.07];

  return (
    <div style={{ width: '200dvh', height: '100dvh' }}>
      <Canvas camera={{ position: [15, 15, 15] }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[10, 10, 10]} />

        <Vertices x0={p0} />
        <Straws x0={p0} />
        <Goms1 x0={p0} />
        <Goms2 x0={p0} />

        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default App;
