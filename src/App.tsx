import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Cylinder, Text, Billboard } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import * as math from 'mathjs';

// --- 定数と行列 ---
const A = math.matrix([[0, 1, 0], [0, 0, -1], [-1, 0, 0]]);
const B = math.matrix([[1, 0, 0], [0, -1, 0], [0, 0, -1]]);
const C = math.matrix([[-1, 0, 0], [0, 1, 0], [0, 0, -1]]);

const mats: any[] = [];
let triIndex = 0;
for (let a = 0; a < 4; a++) {
  for (let b = 0; b < 2; b++) {
    for (let c = 0; c < 2; c++) {
      mats.push({
        M: math.multiply(math.multiply(math.pow(A, a), math.pow(B, b)), math.pow(C, c)),
        tri: triIndex,
      });
      triIndex++;
    }
  }
}

const rubberPath = [  //輪ゴムかける順番の配列
  [1,12],[12,4],[4,11],[11,1],
  [1,6],[6,11],[11,5],[5,10],
  [10,6],[6,2],[2,10],[10,3],
  [3,5],[5,4],[4,8],[8,3],
  [3,9],[9,8],[8,12],[12,7],
  [7,9],[9,2],[2,7],[7,1],
];

// --- コンポーネント ---
function CylinderBetween({ start, end, radius = 0.02, color = 'orange',opacity = 1, }: any) {
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
      <meshStandardMaterial color={color} transparent opacity={opacity}/>
    </Cylinder>
  );
}

function ArrowBetween({ start, end }: any) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);

  const dir = endVec.clone().sub(startVec);
  const length = dir.length();

  // 終点寄り & 少し浮かせる
  const pos = startVec.clone().add(dir.clone().multiplyScalar(0.75));
  pos.y += 0.8; // ★ 浮かせる（超重要）

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  return (
    <group position={pos} quaternion={quaternion}>
      {/* 矢印の棒 */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.2, 12]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* 矢印の先端 */}
      <mesh>
        <coneGeometry args={[0.4, 0.8, 16]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

function RubberEdge({ from, to, color, opacity = 1 }: any) {
  return (
    <CylinderBetween
      start={from}
      end={to}
      radius={0.05}
      color={color}
      opacity={opacity}
    />
  );
}



function Vertex({ xyz, index, color, highlight }: any) {
  return (
    <group position={xyz}>
      <mesh>
      <sphereGeometry args={[highlight ? 0.8 : 0.5, 32, 32]} />
      <meshStandardMaterial color={highlight ? 'hotpink' : color} />
      </mesh>
      <Billboard>
        <Text
          position={[0, 1.2, 0]}
          fontSize={1.2}
          color="white"
          outlineColor="black"
          outlineWidth={0.05}
        >
          {index}
        </Text>
      </Billboard>
    </group>
  );
}

function Vertices({ x0, color }: any) {
  const unique = new Map<string, number[]>();
  mats.forEach(({ M }) => {
    const p = math.multiply(M, math.matrix(x0)).valueOf() as number[];
    const key = p.map((v) => v.toFixed(4)).join(',');
    if (!unique.has(key)) unique.set(key, p);
  });
  return Array.from(unique.values()).map((pt, i) => (
    <Vertex key={i} xyz={pt} index={i + 1} color={color} />
  ));
}

function Triangle({ M, x0, color }: any) {
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

function RubberPath({
  path,
  step,
  vertexMap,
}: any) {
  return (
    <>
      {path.map(([a, b]: number[], i: number) => {
        if (i > step) return null; // 未到達

        const from = vertexMap.get(a);
        const to = vertexMap.get(b);
        if (!from || !to) return null;

        // 色と透明度を決める
        const isCurrent = i === step;

        return (
          <RubberEdge
            key={i}
            from={from}
            to={to}
            color={isCurrent ? '#ff4444' : '#aaaaaa'}
            opacity={isCurrent ? 1 : 0.3}
          />
        );
      })}
    </>
  );
}



function Straws({ x0, colors, visibles }: any) {
  return (
    <>
      {mats.map((m, i) => {
        const visible =
          (m.tri === 0 && visibles.t1) ||
          (m.tri === 1 && visibles.t2) ||
          (m.tri === 2 && visibles.t3) ||
          (m.tri === 3 && visibles.t4);
        if (!visible) return null;
        return (
          <Triangle
            key={i}
            M={m.M}
            x0={x0}
            color={
              m.tri === 0
                ? colors.tri1
                : m.tri === 1
                ? colors.tri2
                : m.tri === 2
                ? colors.tri3
                : colors.tri4
            }
          />
        );
      })}
    </>
  );
}

function Gom1({ x0, M, color }: any) {
  const G1 = math.multiply(A, B);
  const to = math.multiply(math.multiply(M, G1), math.matrix(x0));
  const from = math.multiply(M, math.matrix(x0));
  return <CylinderBetween start={from.valueOf()} end={to.valueOf()} radius={0.05} color={color} />;
}

function Gom2({ x0, M, color }: any) {
  const G2 = math.multiply(A, C);
  const to = math.multiply(math.multiply(M, G2), math.matrix(x0));
  const from = math.multiply(M, math.matrix(x0));
  return <CylinderBetween start={from.valueOf()} end={to.valueOf()} radius={0.05} color={color} />;
}

function Goms({ x0, color, visible }: any) {
  if (!visible) return null;
  return (
    <>
      {mats.map(({ M }, i) => (
        <group key={i}>
          <Gom1 x0={x0} M={M} color={color} />
          <Gom2 x0={x0} M={M} color={color} />
        </group>
      ))}
    </>
  );
}

// --- App本体 ---
export default function App() {
  const [step, setStep] = useState(3); //初期状態は3
  const [rubberStep, setRubberStep] = useState(0);

  const triangleColors = useControls('Triangle Colors', {
    tri1: '#ff0000',
    tri2: '#0000ff',
    tri3: '#00ff00',
    tri4: '#ddff00ff',
  });

  const triangleVisible = useControls('Triangle Visible', {
    t1: true,
    t2: true,
    t3: true,
    t4: true,
  });

  const { gomColor, vertexColor, gomVisible } = useControls('Other Colors', {
    gomColor: '#ffc400ff',
    vertexColor: '#ffffff',
    gomVisible: true,
  });

  // ステップ切り替えボタン
  useControls('Step', {
    '① 点だけ': button(() => setStep(1)),
    '② ストロー追加': button(() => setStep(2)),
    '③ ゴムで完成': button(() => setStep(3)),
  });
  useControls('Rubber Order', {
  Prev: button(() =>
    setRubberStep(s => Math.max(0, s - 1))
  ),
  Next: button(() =>
    setRubberStep(s => Math.min(rubberPath.length - 1, s + 1))
  ),
});


  const p0 = [0, 7.07, 7.07];
    const vertexPositions = useMemo(() => {
    const unique = new Map<string, number[]>();
    mats.forEach(({ M }) => {
      const p = math.multiply(M, math.matrix(p0)).valueOf() as number[];
      const key = p.map(v => v.toFixed(4)).join(',');
      if (!unique.has(key)) unique.set(key, p);
    });
    return Array.from(unique.values());
  }, []);

  const vertexMap = useMemo(() => {
    const map = new Map<number, number[]>();

    const unique = new Map<string, number[]>();
    mats.forEach(({ M }) => {
      const p = math.multiply(M, math.matrix(p0)).valueOf() as number[];
      const key = p.map(v => v.toFixed(4)).join(',');
      if (!unique.has(key)) unique.set(key, p);
    });

    Array.from(unique.values()).forEach((pt, i) => {
      map.set(i + 1, pt);
    });

    return map;
  }, [p0]);
  

  return 
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [15, 15, 15] }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[10, 10, 10]} />
        {/* ① 点 */}
          {step >= 1 && <Vertices x0={p0} color={vertexColor} />}

          {/* ② ストロー */}
          {step >= 2 && (
            <Straws
              x0={p0}
              colors={triangleColors}
              visibles={triangleVisible}
            />
          )}

          {/* ★③ ゴムの順番表示（ここ！！！） */}
          {step >= 3 && (
            <RubberPath
              path={rubberPath}
              step={rubberStep}
              vertexMap={vertexMap}
            />
          )}

          {/* ④ 全部つながったゴム（完成形） */}
          {step >= 3 && (
            <Goms
              x0={p0}
              color={gomColor}
              visible={gomVisible}
            />
          )}

        {/* すでに通った輪ゴム（薄く表示） */}
        {rubberPath.slice(0, rubberStep).map(([from, to], i) => {
          const start = vertexPositions[from - 1];
          const end = vertexPositions[to - 1];
          if (!start || !end) return null;

          return (
            <CylinderBetween
              key={i}
              start={start}
              end={end}
              radius={0.15}
              color="white"
            />
          );
        })}

        {/* 今かける輪ゴム（強調＋矢印） */}
        {(() => {
          const [from, to] = rubberPath[rubberStep];
          const start = vertexPositions[from - 1];
          const end = vertexPositions[to - 1];

          if (!start || !end) return null;

          return (
            <>
              <CylinderBetween
                start={start}
                end={end}
                radius={0.35}
                color="hotpink"
              />
              <ArrowBetween
                start={start}
                end={end}
                color="hotpink"
              />
            </>
          );
        })()}
        

        

        <OrbitControls />
      </Canvas>
    </div>
  );
}
