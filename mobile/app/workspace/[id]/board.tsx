import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { BoardCanvas, type BoardCanvasHandle, type NodePatch } from '@/components/workspace/BoardCanvas';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import { createBoardNode, deleteBoardNode, getWorkspaceBoard, updateBoardNode, type Board, type BoardNode } from '@/lib/api';

export default function WorkspaceBoardScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const canvasRef = useRef<BoardCanvasHandle>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getWorkspaceBoard(id)
        .then((data) => {
          if (cancelled) return;
          setBoard(data);
          setNodes(data.nodes);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load the board.");
        });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  async function handleAddNode(x: number, y: number) {
    if (!board) return;
    try {
      const node = await createBoardNode(board.workspaceId, { x, y });
      setNodes((prev) => [...prev, node]);
    } catch {
      setError("Couldn't add a note.");
    }
  }

  async function handleNodePatch(nodeId: string, patch: NodePatch) {
    if (!board) return;
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
    try {
      await updateBoardNode(board.workspaceId, nodeId, patch);
    } catch {
      setError("Couldn't save that change.");
    }
  }

  async function handleNodeDelete(nodeId: string) {
    if (!board) return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    try {
      await deleteBoardNode(board.workspaceId, nodeId);
    } catch {
      setError("Couldn't delete that note.");
    }
  }

  function handleFocusNode(nodeId: string) {
    canvasRef.current?.focusOnNode(nodeId);
    setPanelOpen(false);
  }

  return (
    <View style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: 'Board',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
          headerRight: () => (
            <AnimatedPressable onPress={() => setPanelOpen((v) => !v)} haptic="selection" hitSlop={10} style={styles.headerToggle}>
              <Text style={styles.headerToggleText}>{panelOpen ? 'Hide' : ''} Notes ({nodes.length})</Text>
            </AnimatedPressable>
          ),
        }}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !board ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      ) : (
        <View style={styles.body}>
          <BoardCanvas
            ref={canvasRef}
            nodes={nodes}
            onAddNode={handleAddNode}
            onNodePatch={handleNodePatch}
            onNodeDelete={handleNodeDelete}
          />

          {panelOpen ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>ALL NOTES</Text>
              <ScrollView contentContainerStyle={styles.panelList}>
                {nodes.length === 0 ? (
                  <Text style={styles.emptyText}>No notes yet — tap “+ Note” to start the board.</Text>
                ) : (
                  nodes.map((node) => (
                    <AnimatedPressable
                      key={node.id}
                      haptic="selection"
                      style={styles.panelRow}
                      onPress={() => handleFocusNode(node.id)}
                    >
                      <View style={[styles.panelSwatch, { backgroundColor: node.color || '#FDF7E4' }]} />
                      <Text style={styles.panelRowText} numberOfLines={2}>
                        {node.text.trim() || 'Untitled note'}
                      </Text>
                    </AnimatedPressable>
                  ))
                )}
              </ScrollView>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Space.xxxl,
    },
    emptyText: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      textAlign: 'center',
    },
    body: {
      flex: 1,
      flexDirection: 'row',
    },
    headerToggle: {
      paddingHorizontal: Space.sm + 2,
      paddingVertical: 5,
    },
    headerToggleText: {
      color: Colors[colorScheme].tint,
      ...Type.body,
      fontWeight: '700',
    },
    panel: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 260,
      backgroundColor: Colors[colorScheme].card,
      borderLeftWidth: 1,
      borderLeftColor: Colors[colorScheme].border,
      paddingTop: Space.md,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: -2, height: 0 },
      elevation: 6,
    },
    panelTitle: {
      color: Colors[colorScheme].muted,
      ...Type.label,
      fontWeight: '700',
      paddingHorizontal: Space.md,
      marginBottom: Space.sm,
    },
    panelList: {
      paddingHorizontal: Space.md,
      paddingBottom: Space.xl,
      gap: Space.sm,
    },
    panelRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Space.sm,
      backgroundColor: Colors[colorScheme].surface2,
      borderRadius: Radius.md,
      padding: Space.sm + 2,
    },
    panelSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
      marginTop: 2,
    },
    panelRowText: {
      flex: 1,
      color: Colors[colorScheme].text,
      ...Type.small,
    },
  });
