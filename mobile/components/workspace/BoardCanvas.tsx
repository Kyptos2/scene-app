import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TextInput, View, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { haptics } from '@/lib/haptics';
import type { BoardNode } from '@/lib/api';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3;
const NOTE_COLORS = ['#FDF7E4', '#FCE3D4', '#DCEBDD', '#DCE6F5', '#F0DCE8'];
const MIN_NOTE_WIDTH = 140;
const MIN_NOTE_HEIGHT = 90;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(t1: { pageX: number; pageY: number }, t2: { pageX: number; pageY: number }) {
  return Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
}

function midpoint(t1: { pageX: number; pageY: number }, t2: { pageX: number; pageY: number }) {
  return { x: (t1.pageX + t2.pageX) / 2, y: (t1.pageY + t2.pageY) / 2 };
}

export type NodePatch = Partial<{ x: number; y: number; width: number; height: number; color: string; text: string }>;

export type BoardCanvasHandle = {
  focusOnNode: (nodeId: string) => void;
};

type Props = {
  nodes: BoardNode[];
  onNodePatch: (nodeId: string, patch: NodePatch) => void;
  onNodeDelete: (nodeId: string) => void;
  onAddNode: (x: number, y: number) => void;
};

// Infinite freeform canvas, Milanote-style: a single "world" layer holding
// all notes at absolute canvas-space coordinates, panned/zoomed via one
// transform on that layer. Nodes store world-space x/y/width/height so the
// server never needs to know the client's current viewport — panning and
// zooming are purely local. Built on core PanResponder (no
// react-native-gesture-handler in this app) plus a native wheel listener on
// web, since RN Web renders real DOM nodes we can attach to directly.
export const BoardCanvas = forwardRef<BoardCanvasHandle, Props>(function BoardCanvas(
  { nodes, onNodePatch, onNodeDelete, onAddNode },
  ref,
) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);

  const [transform, setTransform] = useState<{ panX: number; panY: number; zoom: number }>({
    panX: Space.lg,
    panY: Space.lg,
    zoom: 1,
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerOffsetRef = useRef({ pageX: 0, pageY: 0 });
  const containerRef = useRef<View>(null);

  // Baselines captured whenever the active touch count changes (1 -> pan,
  // 2 -> pinch) so every subsequent move is computed relative to a single
  // clean snapshot instead of drifting frame to frame.
  const panBaseRef = useRef<{ panX: number; panY: number; touchX: number; touchY: number } | null>(null);
  const pinchBaseRef = useRef<{ distance: number; midX: number; midY: number; zoom: number; panX: number; panY: number } | null>(null);
  const lastTouchCountRef = useRef(0);

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((pageX, pageY) => {
      containerOffsetRef.current = { pageX, pageY };
    });
  }, []);

  const localPoint = useCallback((pageX: number, pageY: number) => {
    return { x: pageX - containerOffsetRef.current.pageX, y: pageY - containerOffsetRef.current.pageY };
  }, []);

  const zoomAround = useCallback((focalX: number, focalY: number, nextZoom: number) => {
    setTransform((prev) => {
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const worldX = (focalX - prev.panX) / prev.zoom;
      const worldY = (focalY - prev.panY) / prev.zoom;
      return { zoom, panX: focalX - worldX * zoom, panY: focalY - worldY * zoom };
    });
  }, []);

  const canvasPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          panBaseRef.current = null;
          pinchBaseRef.current = null;
          lastTouchCountRef.current = 0;
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const touches = evt.nativeEvent.touches;
          const count = touches.length;

          if (count >= 2) {
            const p0 = localPoint(touches[0].pageX, touches[0].pageY);
            const p1 = localPoint(touches[1].pageX, touches[1].pageY);
            const dist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
            const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

            if (lastTouchCountRef.current !== 2 || !pinchBaseRef.current) {
              pinchBaseRef.current = { distance: dist || 1, midX: mid.x, midY: mid.y, zoom: transformRef.current.zoom, panX: transformRef.current.panX, panY: transformRef.current.panY };
              lastTouchCountRef.current = 2;
              return;
            }

            const base = pinchBaseRef.current;
            const scale = dist / base.distance;
            const newZoom = clamp(base.zoom * scale, MIN_ZOOM, MAX_ZOOM);
            const worldFocalX = (base.midX - base.panX) / base.zoom;
            const worldFocalY = (base.midY - base.panY) / base.zoom;
            setTransform({
              zoom: newZoom,
              panX: mid.x - worldFocalX * newZoom,
              panY: mid.y - worldFocalY * newZoom,
            });
            return;
          }

          if (count === 1) {
            const p = localPoint(touches[0].pageX, touches[0].pageY);
            if (lastTouchCountRef.current !== 1 || !panBaseRef.current) {
              panBaseRef.current = { panX: transformRef.current.panX, panY: transformRef.current.panY, touchX: p.x, touchY: p.y };
              lastTouchCountRef.current = 1;
              return;
            }
            const base = panBaseRef.current;
            setTransform((prev) => ({ ...prev, panX: base.panX + (p.x - base.touchX), panY: base.panY + (p.y - base.touchY) }));
          }
        },
        onPanResponderRelease: () => {
          panBaseRef.current = null;
          pinchBaseRef.current = null;
          lastTouchCountRef.current = 0;
        },
        onPanResponderTerminate: () => {
          panBaseRef.current = null;
          pinchBaseRef.current = null;
          lastTouchCountRef.current = 0;
        },
      }),
    [localPoint],
  );

  // Mouse-wheel zoom on web — RN Web forwards the View ref to the real DOM
  // node, so we can attach a native listener directly instead of routing
  // through PanResponder (which has no wheel concept).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.001);
      zoomAround(x, y, transformRef.current.zoom * factor);
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [zoomAround]);

  useImperativeHandle(
    ref,
    () => ({
      focusOnNode: (nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || containerSize.width === 0) return;
        const targetZoom = 1;
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        setTransform({
          zoom: targetZoom,
          panX: containerSize.width / 2 - centerX * targetZoom,
          panY: containerSize.height / 2 - centerY * targetZoom,
        });
      },
    }),
    [nodes, containerSize],
  );

  function handleAddNote() {
    haptics.medium();
    const centerX = (containerSize.width / 2 - transform.panX) / transform.zoom;
    const centerY = (containerSize.height / 2 - transform.panY) / transform.zoom;
    const jitter = () => (Math.random() - 0.5) * 40;
    onAddNode(centerX - 110 + jitter(), centerY - 80 + jitter());
  }

  function handleZoomButton(factor: number) {
    haptics.selection();
    zoomAround(containerSize.width / 2, containerSize.height / 2, transform.zoom * factor);
  }

  function handleReset() {
    haptics.selection();
    setTransform({ panX: Space.lg, panY: Space.lg, zoom: 1 });
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={(e) => {
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
        measureContainer();
      }}
      {...canvasPanResponder.panHandlers}
    >
      <View
        style={[
          styles.world,
          { transform: [{ translateX: transform.panX }, { translateY: transform.panY }, { scale: transform.zoom }] },
        ]}
      >
        {nodes.map((node) => (
          <NoteCard
            key={node.id}
            node={node}
            zoom={transform.zoom}
            colorScheme={colorScheme}
            onPatch={(patch) => onNodePatch(node.id, patch)}
            onDelete={() => onNodeDelete(node.id)}
          />
        ))}
      </View>

      <View style={styles.controls} pointerEvents="box-none">
        <AnimatedPressable style={styles.controlButton} haptic="medium" onPress={handleAddNote}>
          <Text style={styles.controlButtonText}>+ Note</Text>
        </AnimatedPressable>
        <View style={styles.zoomCluster}>
          <AnimatedPressable style={styles.zoomButton} haptic="selection" onPress={() => handleZoomButton(0.8)}>
            <Text style={styles.zoomButtonText}>−</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.zoomButton} haptic="selection" onPress={handleReset}>
            <Text style={styles.zoomPercentText}>{Math.round(transform.zoom * 100)}%</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.zoomButton} haptic="selection" onPress={() => handleZoomButton(1.25)}>
            <Text style={styles.zoomButtonText}>+</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
});

function NoteCard({
  node,
  zoom,
  colorScheme,
  onPatch,
  onDelete,
}: {
  node: BoardNode;
  zoom: number;
  colorScheme: 'light' | 'dark';
  onPatch: (patch: NodePatch) => void;
  onDelete: () => void;
}) {
  const styles = createStyles(colorScheme);
  const [text, setText] = useState(node.text);
  const [pos, setPos] = useState({ x: node.x, y: node.y, width: node.width, height: node.height });
  const draggingRef = useRef(false);
  const dragBaseRef = useRef({ x: node.x, y: node.y });
  const resizeBaseRef = useRef({ width: node.width, height: node.height });

  useEffect(() => {
    if (draggingRef.current) return;
    setPos({ x: node.x, y: node.y, width: node.width, height: node.height });
  }, [node.x, node.y, node.width, node.height]);

  useEffect(() => {
    setText(node.text);
  }, [node.text]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          draggingRef.current = true;
          dragBaseRef.current = { x: pos.x, y: pos.y };
          haptics.light();
        },
        onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
          setPos((prev) => ({
            ...prev,
            x: dragBaseRef.current.x + gesture.dx / zoom,
            y: dragBaseRef.current.y + gesture.dy / zoom,
          }));
        },
        onPanResponderRelease: () => {
          draggingRef.current = false;
          setPos((prev) => {
            onPatch({ x: prev.x, y: prev.y });
            return prev;
          });
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoom, pos.x, pos.y, onPatch],
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resizeBaseRef.current = { width: pos.width, height: pos.height };
        },
        onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
          setPos((prev) => ({
            ...prev,
            width: Math.max(MIN_NOTE_WIDTH, resizeBaseRef.current.width + gesture.dx / zoom),
            height: Math.max(MIN_NOTE_HEIGHT, resizeBaseRef.current.height + gesture.dy / zoom),
          }));
        },
        onPanResponderRelease: () => {
          setPos((prev) => {
            onPatch({ width: prev.width, height: prev.height });
            return prev;
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoom, pos.width, pos.height, onPatch],
  );

  return (
    <View
      style={[
        styles.note,
        { left: pos.x, top: pos.y, width: pos.width, height: pos.height, backgroundColor: node.color || NOTE_COLORS[0] },
      ]}
    >
      <View style={styles.noteHeader}>
        <View style={styles.dragHandle} {...dragResponder.panHandlers}>
          <Text style={styles.dragGlyph}>⠿⠿</Text>
        </View>
        <View style={styles.colorDots}>
          {NOTE_COLORS.map((c) => (
            <AnimatedPressable
              key={c}
              haptic="selection"
              style={[styles.colorDot, { backgroundColor: c }, c === node.color && styles.colorDotActive]}
              onPress={() => onPatch({ color: c })}
            />
          ))}
        </View>
        <AnimatedPressable haptic="medium" style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteButtonText}>×</Text>
        </AnimatedPressable>
      </View>

      <TextInput
        style={styles.noteInput}
        value={text}
        onChangeText={setText}
        onBlur={() => {
          if (text !== node.text) onPatch({ text });
        }}
        multiline
        placeholder="Type here…"
        placeholderTextColor="#00000066"
      />

      <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
        <Text style={styles.resizeGlyph}>◢</Text>
      </View>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: Colors[colorScheme].background,
    },
    world: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    },
    note: {
      position: 'absolute',
      borderRadius: Radius.md,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      overflow: 'hidden',
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Space.xs,
      paddingVertical: 4,
      gap: Space.xs,
    },
    dragHandle: {
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    dragGlyph: {
      color: '#00000055',
      fontSize: 12,
      letterSpacing: -1,
    },
    colorDots: {
      flexDirection: 'row',
      gap: 4,
      flex: 1,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#00000022',
    },
    colorDotActive: {
      borderColor: '#00000088',
      borderWidth: 2,
    },
    deleteButton: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonText: {
      color: '#00000077',
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '700',
    },
    noteInput: {
      flex: 1,
      color: '#1A1A1A',
      ...Type.small,
      paddingHorizontal: Space.sm,
      paddingBottom: Space.sm,
      textAlignVertical: 'top',
    },
    resizeHandle: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resizeGlyph: {
      color: '#00000044',
      fontSize: 10,
    },
    controls: {
      position: 'absolute',
      right: Space.md,
      bottom: Space.md,
      alignItems: 'flex-end',
      gap: Space.sm,
    },
    controlButton: {
      backgroundColor: Colors[colorScheme].tint,
      borderRadius: Radius.pill,
      paddingHorizontal: Space.lg,
      paddingVertical: Space.sm + 2,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    controlButtonText: {
      color: Colors[colorScheme].background,
      ...Type.body,
      fontWeight: '700',
    },
    zoomCluster: {
      flexDirection: 'row',
      backgroundColor: Colors[colorScheme].card,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    zoomButton: {
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 40,
    },
    zoomButtonText: {
      color: Colors[colorScheme].text,
      ...Type.title,
      fontWeight: '600',
    },
    zoomPercentText: {
      color: Colors[colorScheme].muted,
      ...Type.caption,
      fontWeight: '700',
    },
  });
