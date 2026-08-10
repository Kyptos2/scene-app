import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

// The brand mark: four corner brackets (the frame — "the scene") around four
// connected nodes (the network — the filmmakers). Split into two pieces,
// SceneMarkFrame and SceneMarkNetwork, sharing the same 100x100 coordinate
// space so they overlay pixel-for-pixel — SceneMark below just stacks them
// for normal static use, while SceneSplash animates them in separately to
// stage the frame-then-network reveal.
const VIEWBOX = 100;
const FRAME_STROKE = 7;
const NETWORK_STROKE = 5;
const NODE_RADIUS = 6.5;

export function SceneMarkFrame({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Path d="M12 32 L12 12 L32 12" stroke={color} strokeWidth={FRAME_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M68 12 L88 12 L88 32" stroke={color} strokeWidth={FRAME_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M88 68 L88 88 L68 88" stroke={color} strokeWidth={FRAME_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M32 88 L12 88 L12 68" stroke={color} strokeWidth={FRAME_STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function SceneMarkNetwork({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Line x1={34} y1={34} x2={66} y2={34} stroke={color} strokeWidth={NETWORK_STROKE} strokeLinecap="round" />
      <Line x1={34} y1={66} x2={66} y2={66} stroke={color} strokeWidth={NETWORK_STROKE} strokeLinecap="round" />
      <Line x1={34} y1={34} x2={34} y2={66} stroke={color} strokeWidth={NETWORK_STROKE} strokeLinecap="round" />
      <Line x1={66} y1={34} x2={66} y2={66} stroke={color} strokeWidth={NETWORK_STROKE} strokeLinecap="round" />
      <Circle cx={34} cy={34} r={NODE_RADIUS} fill={color} />
      <Circle cx={66} cy={34} r={NODE_RADIUS} fill={color} />
      <Circle cx={34} cy={66} r={NODE_RADIUS} fill={color} />
      <Circle cx={66} cy={66} r={NODE_RADIUS} fill={color} />
    </Svg>
  );
}

// The universal static mark — every screen that just needs to show the logo
// (welcome, header, etc.) renders this rather than composing the two pieces
// itself, so there's one place that owns how frame and network line up.
export function SceneMark({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={StyleSheet.absoluteFill}>
        <SceneMarkFrame size={size} color={color} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <SceneMarkNetwork size={size} color={color} />
      </View>
    </View>
  );
}
