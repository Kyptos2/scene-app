import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Fonts, Type } from '@/constants/Typography';
import { ApiError, subscribeGold, type SubscriptionStatus } from '@/lib/api';

// A brass/gold tone distinct from the brand's terracotta tint — scoped to
// this screen only, the same file-local-constant pattern used elsewhere in
// the app (see AMBER in HomeDashboard) rather than adding a third accent to
// the global palette for one plan tier.
const GOLD = { light: '#9C7A28', dark: '#C9A24B' } as const;

type FieldErrors = Partial<Record<'cardholderName' | 'cardNumber' | 'expiry' | 'cvv' | 'billingZip', string>>;

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function CheckoutSheet({
  visible,
  onClose,
  onSubscribed,
}: {
  visible: boolean;
  onClose: () => void;
  onSubscribed: (status: SubscriptionStatus) => void;
}) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setCardholderName('');
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
    setBillingZip('');
    setErrors({});
    setSubmitError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!cardholderName.trim()) next.cardholderName = 'Enter the name on the card.';

    const digits = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(digits) || !luhnValid(digits)) next.cardNumber = 'Enter a valid card number.';

    const month = Number(expiryMonth);
    const year = Number(expiryYear.length === 2 ? `20${expiryYear}` : expiryYear);
    const now = new Date();
    const validMonth = month >= 1 && month <= 12;
    if (!expiryMonth || !expiryYear || !validMonth) {
      next.expiry = 'Enter a valid expiration date.';
    } else {
      const expiresEndOfMonth = new Date(year, month, 0, 23, 59, 59);
      if (expiresEndOfMonth < now) next.expiry = 'This card has expired.';
    }

    if (!/^\d{3,4}$/.test(cvv)) next.cvv = 'Enter a valid CVV.';
    if (billingZip.trim().length < 3) next.billingZip = 'Enter a valid postal code.';

    return next;
  }

  async function handleSubmit() {
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0 || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const year = expiryYear.length === 2 ? Number(`20${expiryYear}`) : Number(expiryYear);
      const status = await subscribeGold({
        cardholderName: cardholderName.trim(),
        cardNumber: cardNumber.replace(/\s+/g, ''),
        expiryMonth: Number(expiryMonth),
        expiryYear: year,
        cvv,
        billingZip: billingZip.trim(),
      });
      reset();
      onSubscribed(status);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Upgrade to Gold</Text>
                <Text style={styles.subtitle}>$45/month · Cancel anytime</Text>
              </View>
              <Pressable onPress={handleClose} hitSlop={10}>
                <Text style={styles.closeText}>Cancel</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Cardholder name</Text>
              <TextInput
                style={[styles.input, errors.cardholderName && styles.inputError]}
                placeholder="Full name on card"
                placeholderTextColor={Colors[colorScheme].muted}
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
              />
              {errors.cardholderName ? <Text style={styles.errorText}>{errors.cardholderName}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Card number</Text>
              <TextInput
                style={[styles.input, errors.cardNumber && styles.inputError]}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={Colors[colorScheme].muted}
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                keyboardType="number-pad"
                maxLength={23}
              />
              {errors.cardNumber ? <Text style={styles.errorText}>{errors.cardNumber}</Text> : null}
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Expiration</Text>
                <View style={styles.expiryRow}>
                  <TextInput
                    style={[styles.input, styles.expiryInput, errors.expiry && styles.inputError]}
                    placeholder="MM"
                    placeholderTextColor={Colors[colorScheme].muted}
                    value={expiryMonth}
                    onChangeText={(v) => setExpiryMonth(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.expirySlash}>/</Text>
                  <TextInput
                    style={[styles.input, styles.expiryInput, errors.expiry && styles.inputError]}
                    placeholder="YY"
                    placeholderTextColor={Colors[colorScheme].muted}
                    value={expiryYear}
                    onChangeText={(v) => setExpiryYear(v.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                {errors.expiry ? <Text style={styles.errorText}>{errors.expiry}</Text> : null}
              </View>

              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>CVV</Text>
                <TextInput
                  style={[styles.input, errors.cvv && styles.inputError]}
                  placeholder="123"
                  placeholderTextColor={Colors[colorScheme].muted}
                  value={cvv}
                  onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                />
                {errors.cvv ? <Text style={styles.errorText}>{errors.cvv}</Text> : null}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Billing ZIP / postal code</Text>
              <TextInput
                style={[styles.input, errors.billingZip && styles.inputError]}
                placeholder="94103"
                placeholderTextColor={Colors[colorScheme].muted}
                value={billingZip}
                onChangeText={setBillingZip}
                autoCapitalize="characters"
                maxLength={12}
              />
              {errors.billingZip ? <Text style={styles.errorText}>{errors.billingZip}</Text> : null}
            </View>

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <AnimatedPressable style={styles.subscribeButton} haptic="medium" onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.subscribeButtonText}>Subscribe — $45/month</Text>
              )}
            </AnimatedPressable>
            <Text style={styles.disclaimer}>
              No card data is stored — this is a demo checkout until a payment provider is connected.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      maxHeight: '90%',
      backgroundColor: Colors[colorScheme].background,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
    },
    content: {
      padding: Space.lg,
      paddingBottom: Space.xxxl,
      gap: Space.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: Space.sm,
    },
    title: {
      color: Colors[colorScheme].text,
      ...Type.title,
      fontFamily: Fonts.serif,
    },
    subtitle: {
      color: Colors[colorScheme].muted,
      ...Type.small,
      marginTop: 2,
    },
    closeText: {
      color: Colors[colorScheme].tint,
      ...Type.body,
      fontWeight: '600',
    },
    field: {
      gap: 6,
    },
    label: {
      color: Colors[colorScheme].muted,
      ...Type.label,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    input: {
      backgroundColor: Colors[colorScheme].card,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Space.md,
      paddingVertical: Space.sm + 2,
      color: Colors[colorScheme].text,
      ...Type.bodyLarge,
    },
    inputError: {
      borderColor: Colors[colorScheme].error,
    },
    errorText: {
      color: Colors[colorScheme].error,
      ...Type.caption,
    },
    row: {
      flexDirection: 'row',
      gap: Space.md,
    },
    flex1: {
      flex: 1,
    },
    expiryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Space.xs,
    },
    expiryInput: {
      flex: 1,
      textAlign: 'center',
    },
    expirySlash: {
      color: Colors[colorScheme].muted,
      ...Type.bodyLarge,
    },
    submitError: {
      color: Colors[colorScheme].error,
      ...Type.small,
      textAlign: 'center',
    },
    subscribeButton: {
      backgroundColor: GOLD[colorScheme],
      borderRadius: Radius.xxl + 2,
      paddingVertical: Space.md,
      alignItems: 'center',
      marginTop: Space.sm,
    },
    subscribeButtonText: {
      color: '#FFFFFF',
      ...Type.bodyLarge,
      fontWeight: '700',
    },
    disclaimer: {
      color: Colors[colorScheme].muted,
      ...Type.caption,
      textAlign: 'center',
    },
  });
