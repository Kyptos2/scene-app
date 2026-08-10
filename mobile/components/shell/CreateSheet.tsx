import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { PostCrewCallSheet } from '@/components/home/PostCrewCallSheet';
import { PostPollSheet } from '@/components/home/PostPollSheet';
import { PostUpdateSheet } from '@/components/home/PostUpdateSheet';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { notifyFeedShouldRefresh } from '@/lib/feedEvents';

type Mode = 'menu' | 'crew_call' | 'update' | 'poll';

// The single global entry point for the [+] tab button — every creation
// flow the app has (crew call, update, QR connect) is reachable from any
// tab, not just from Home. The two form flows themselves are untouched;
// this is only the shell around them.
export function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [mode, setMode] = useState<Mode>('menu');

  function handleClose() {
    setMode('menu');
    onClose();
  }

  function handleDone() {
    setMode('menu');
    onClose();
    router.push('/');
    notifyFeedShouldRefresh();
  }

  function handleScan() {
    handleClose();
    router.push('/modal');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'menu'
              ? 'Create'
              : mode === 'crew_call'
                ? 'Post a Crew Call'
                : mode === 'poll'
                  ? 'Create a Poll'
                  : 'Share an Update'}
          </Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        {mode === 'menu' ? (
          <ScrollView contentContainerStyle={styles.menu}>
            <Pressable style={styles.option} onPress={() => setMode('crew_call')}>
              <View style={[styles.optionIcon, styles.optionIconHiring]}>
                <SymbolView
                  name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' }}
                  size={18}
                  tintColor={Colors[colorScheme].tint}
                />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>Post a Crew Call</Text>
                <Text style={styles.optionSubtitle}>Hire for a role on one of your projects</Text>
              </View>
            </Pressable>

            <Pressable style={styles.option} onPress={() => setMode('update')}>
              <View style={[styles.optionIcon, styles.optionIconUpdate]}>
                <SymbolView
                  name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
                  size={18}
                  tintColor={Colors[colorScheme].secondary}
                />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>Share an Update</Text>
                <Text style={styles.optionSubtitle}>Wrap photos, a poster reveal, an award, a launch</Text>
              </View>
            </Pressable>

            <Pressable style={styles.option} onPress={() => setMode('poll')}>
              <View style={[styles.optionIcon, styles.optionIconPoll]}>
                <SymbolView
                  name={{ ios: 'chart.bar.fill', android: 'poll', web: 'poll' }}
                  size={18}
                  tintColor={Colors[colorScheme].tint}
                />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>Create a Poll</Text>
                <Text style={styles.optionSubtitle}>Ask the community a question, get real votes</Text>
              </View>
            </Pressable>

            <Pressable style={styles.option} onPress={handleScan}>
              <View style={[styles.optionIcon, styles.optionIconScan]}>
                <SymbolView
                  name={{ ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' }}
                  size={18}
                  tintColor={Colors[colorScheme].text}
                />
              </View>
              <View style={styles.optionMeta}>
                <Text style={styles.optionTitle}>Scan a Filmmaker</Text>
                <Text style={styles.optionSubtitle}>Connect instantly via QR code, in person</Text>
              </View>
            </Pressable>
          </ScrollView>
        ) : mode === 'crew_call' ? (
          <ScrollView contentContainerStyle={styles.formWrap}>
            <PostCrewCallSheet onCancel={() => setMode('menu')} onDone={handleDone} />
          </ScrollView>
        ) : mode === 'poll' ? (
          <ScrollView contentContainerStyle={styles.formWrap}>
            <PostPollSheet onCancel={() => setMode('menu')} onDone={handleDone} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.formWrap}>
            <PostUpdateSheet onCancel={() => setMode('menu')} onDone={handleDone} />
          </ScrollView>
        )}
      </View>
    </Modal>
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
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    color: Colors[colorScheme].tint,
    fontSize: 15,
    fontWeight: '600',
  },
  menu: {
    padding: 16,
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors[colorScheme].card,
    borderRadius: 14,
    padding: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconHiring: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
  },
  optionIconUpdate: {
    backgroundColor: 'rgba(78, 104, 81, 0.22)',
  },
  optionIconScan: {
    backgroundColor: 'rgba(220,201,169,0.12)',
  },
  optionIconPoll: {
    backgroundColor: 'rgba(184, 58, 45, 0.16)',
  },
  optionMeta: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: Colors[colorScheme].text,
    fontSize: 15,
    fontWeight: '700',
  },
  optionSubtitle: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
  },
  formWrap: {
    padding: 16,
  },
});
