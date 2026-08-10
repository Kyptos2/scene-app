import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CheckoutSheet } from '@/components/subscription/CheckoutSheet';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { cancelSubscription, getSubscription, type SubscriptionStatus } from '@/lib/api';

// Same brass/gold tone as CheckoutSheet — kept local to the subscription
// surface rather than promoted to the shared palette, since it names one
// plan tier rather than a reusable semantic color.
const GOLD = { light: '#9C7A28', dark: '#C9A24B' } as const;

const FREE_FEATURES = [
  'Filmmaker profile & portfolio',
  'Networking & connections',
  'Direct messaging',
  'Projects & crew calls',
  'Team workspaces',
];

const GOLD_FEATURES = ['Everything in Free', 'Full Festival access', 'Exclusive Festival networking'];

function PlanBadge({ tier }: { tier: 'FREE' | 'GOLD' }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={[styles.currentBadge, tier === 'GOLD' && styles.currentBadgeGold]}>
      <Text style={[styles.currentBadgeText, tier === 'GOLD' && styles.currentBadgeTextGold]}>Current plan</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const { refreshProfile } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSubscription()
        .then((res) => {
          if (!cancelled) setStatus(res);
        })
        .catch(() => {
          if (!cancelled) setError("Couldn't load your plan. Try again.");
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleCancelGold() {
    setConfirmingCancel(false);
    setCancelling(true);
    try {
      const next = await cancelSubscription();
      setStatus(next);
      await refreshProfile();
    } finally {
      setCancelling(false);
    }
  }

  const tier = status?.subscriptionTier ?? 'FREE';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Plans',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subheading}>Everything you need to work is free. Festivals is the one thing Gold adds.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!status && !error ? <ActivityIndicator color={Colors[colorScheme].muted} style={styles.loading} /> : null}

        {status ? (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.planName}>Free</Text>
                {tier === 'FREE' ? <PlanBadge tier="FREE" /> : null}
              </View>
              <Text style={styles.price}>$0</Text>
              <View style={styles.featureList}>
                {FREE_FEATURES.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={15}
                      tintColor={Colors[colorScheme].secondary}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
                <View style={styles.featureRow}>
                  <SymbolView
                    name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                    size={14}
                    tintColor={Colors[colorScheme].muted}
                  />
                  <Text style={styles.featureTextLocked}>Festivals — requires Gold</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, styles.cardGold]}>
              <View style={styles.cardHeader}>
                <View style={styles.goldNameRow}>
                  <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={16} tintColor={GOLD[colorScheme]} />
                  <Text style={[styles.planName, styles.planNameGold]}>Gold</Text>
                </View>
                {tier === 'GOLD' ? <PlanBadge tier="GOLD" /> : null}
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.price, styles.priceGold]}>$45</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <View style={styles.featureList}>
                {GOLD_FEATURES.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={15}
                      tintColor={GOLD[colorScheme]}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {tier === 'GOLD' ? (
                <AnimatedPressable
                  style={styles.cancelButton}
                  haptic="light"
                  onPress={() => setConfirmingCancel(true)}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator color={Colors[colorScheme].muted} size="small" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel Gold</Text>
                  )}
                </AnimatedPressable>
              ) : (
                <AnimatedPressable style={styles.upgradeButton} haptic="medium" onPress={() => setCheckoutVisible(true)}>
                  <Text style={styles.upgradeButtonText}>Upgrade to Gold</Text>
                </AnimatedPressable>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <CheckoutSheet
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        onSubscribed={(next) => {
          setStatus(next);
          setCheckoutVisible(false);
          refreshProfile();
        }}
      />

      <ConfirmDialog
        visible={confirmingCancel}
        title="Cancel Gold?"
        message="You'll lose Festival access immediately."
        confirmLabel="Cancel Gold"
        destructive
        onConfirm={handleCancelGold}
        onCancel={() => setConfirmingCancel(false)}
      />
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    content: {
      padding: Space.lg,
      paddingBottom: Space.huge + Space.xxxl,
      gap: Space.md,
    },
    subheading: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      marginBottom: Space.md,
    },
    loading: {
      marginTop: Space.xxxl,
    },
    errorText: {
      color: Colors[colorScheme].error,
      ...Type.body,
    },
    card: {
      backgroundColor: Colors[colorScheme].card,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Space.lg,
      gap: Space.sm,
    },
    cardGold: {
      borderColor: GOLD[colorScheme],
      borderWidth: 1.5,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    goldNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    planName: {
      color: Colors[colorScheme].text,
      ...Type.heading,
      fontFamily: Fonts.serif,
    },
    planNameGold: {
      color: GOLD[colorScheme],
    },
    currentBadge: {
      backgroundColor: Colors[colorScheme].surface2,
      borderRadius: Radius.pill,
      paddingHorizontal: Space.sm + 2,
      paddingVertical: 4,
    },
    currentBadgeGold: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: GOLD[colorScheme],
    },
    currentBadgeText: {
      color: Colors[colorScheme].muted,
      ...Type.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    currentBadgeTextGold: {
      color: GOLD[colorScheme],
    },
    price: {
      color: Colors[colorScheme].text,
      ...Type.hero,
      fontFamily: Fonts.serif,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    priceGold: {
      color: GOLD[colorScheme],
    },
    pricePeriod: {
      color: Colors[colorScheme].muted,
      ...Type.body,
      marginBottom: 6,
    },
    featureList: {
      gap: Space.sm,
      marginTop: Space.xs,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.sm,
    },
    featureText: {
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
      flex: 1,
    },
    featureTextLocked: {
      color: Colors[colorScheme].muted,
      ...Type.bodyLarge,
      flex: 1,
    },
    upgradeButton: {
      backgroundColor: GOLD[colorScheme],
      borderRadius: Radius.xxl + 2,
      paddingVertical: Space.md,
      alignItems: 'center',
      marginTop: Space.sm,
    },
    upgradeButtonText: {
      color: '#FFFFFF',
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: Radius.xxl + 2,
      paddingVertical: Space.md,
      alignItems: 'center',
      marginTop: Space.sm,
    },
    cancelButtonText: {
      color: Colors[colorScheme].muted,
      ...Type.bodyLarge,
      fontWeight: '600',
    },
  });
