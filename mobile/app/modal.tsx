import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { createConnection, API_BASE_URL } from '@/lib/api';
import Colors from '@/constants/Colors';

type Mode = 'menu' | 'myQr' | 'scanning' | 'scanned';

export default function QuickConnectModal() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('menu');
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [connectState, setConnectState] = useState<'idle' | 'connecting' | 'done' | 'error'>('idle');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  async function startScanning() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setScannedUserId(null);
    setConnectState('idle');
    setMode('scanning');
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (mode !== 'scanning') return;
    const match = result.data.match(/\/connect\/([^/?#]+)/);
    if (!match) return;
    setScannedUserId(match[1]);
    setMode('scanned');
  }

  async function handleConnect() {
    if (!scannedUserId) return;
    setConnectState('connecting');
    setConnectError(null);
    try {
      await createConnection(scannedUserId);
      setConnectState('done');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Something went wrong.');
      setConnectState('error');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Connect</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      {mode === 'menu' && (
        <View style={styles.menu}>
          <Pressable style={styles.option} onPress={startScanning}>
            <Text style={styles.optionTitle}>Scan a Profile QR</Text>
            <Text style={styles.optionSubtitle}>Point your camera at someone's SCENE code</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={() => setMode('myQr')}>
            <Text style={styles.optionTitle}>My QR Code</Text>
            <Text style={styles.optionSubtitle}>Let someone scan this to connect with you</Text>
          </Pressable>

          <View style={[styles.option, styles.optionDisabled]}>
            <Text style={styles.optionTitle}>NFC Tap</Text>
            <Text style={styles.optionSubtitle}>Android tap-to-connect — coming soon</Text>
          </View>
        </View>
      )}

      {mode === 'myQr' && user && (
        <View style={styles.qrWrap}>
          <View style={styles.qrCard}>
            <QRCode value={`${API_BASE_URL}/connect/${user.id}`} size={220} />
          </View>
          <Text style={styles.optionTitle}>{user.name}</Text>
          <Text style={styles.optionSubtitle}>Have someone scan this with SCENE's scanner</Text>
          <Pressable style={styles.secondaryButton} onPress={() => setMode('menu')}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      )}

      {mode === 'scanning' && permission?.granted && (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scanFrame} pointerEvents="none" />
          <Pressable style={styles.cancelScan} onPress={() => setMode('menu')}>
            <Text style={styles.cancelScanText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {mode === 'scanning' && !permission?.granted && (
        <View style={styles.menu}>
          <Text style={styles.optionSubtitle}>Camera access is needed to scan a QR code.</Text>
        </View>
      )}

      {mode === 'scanned' && (
        <View style={styles.menu}>
          {connectState === 'done' ? (
            <>
              <Text style={styles.optionTitle}>Connected!</Text>
              <Text style={styles.optionSubtitle}>
                You can find each other on SCENE from now on.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.optionTitle}>Profile scanned</Text>
              <Text style={styles.optionSubtitle}>Save this as a connection?</Text>
              {connectError && <Text style={styles.error}>{connectError}</Text>}
              <Pressable
                style={styles.option}
                onPress={handleConnect}
                disabled={connectState === 'connecting'}
              >
                {connectState === 'connecting' ? (
                  <ActivityIndicator color={Colors[colorScheme].tint} />
                ) : (
                  <Text style={styles.optionTitle}>Connect</Text>
                )}
              </Pressable>
            </>
          )}
          <Pressable style={styles.secondaryButton} onPress={startScanning}>
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    color: Colors[colorScheme].tint,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    padding: 20,
    gap: 12,
  },
  option: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionTitle: {
    color: Colors[colorScheme].text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: Colors[colorScheme].muted,
    fontSize: 13,
    textAlign: 'center',
  },
  qrWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    fontWeight: '600',
  },
  cameraWrap: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  scanFrame: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    bottom: '35%',
    borderWidth: 2,
    borderColor: Colors[colorScheme].tint,
    borderRadius: 16,
  },
  cancelScan: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  cancelScanText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: Colors[colorScheme].error,
    fontSize: 13,
  },
});
