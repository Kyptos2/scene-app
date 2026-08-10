import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

function Section({ title, children }: { title: string; children: string }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const EFFECTIVE_DATE = 'August 1, 2026';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.effective}>Effective {EFFECTIVE_DATE}</Text>

        <Section title="1. What we collect">
          Account info you give us directly: name, email, password (stored as a hash, never in
          plain text), profile photo, bio, roles, experience level, and portfolio links. Content you
          create: projects, credits, crew calls, reviews, feed posts, messages, and comments.
          Location, if you allow it, to power nearby crew calls, festivals, and proximity features.
          Device push tokens, if you allow notifications, so we can deliver them.
        </Section>

        <Section title="2. How we use it">
          To run the core features of SCENE — your feed, search, crew-call matching, messaging,
          festival discovery, and the Indie Catalog. To send you push notifications and emails for
          things you've opted into or that are essential to your account, like password resets and
          email verification. To detect abuse and enforce our Terms of Service.
        </Section>

        <Section title="3. What other users can see">
          Your public profile (name, username, tagline, bio, roles, verified credits, portfolio) is
          visible to other users. Your exact location is never shown to other users — only an
          approximate distance in kilometers is shown when relevant to a feature. Your email address
          is never shown to other users. Direct messages and workspace channel messages are visible
          only to the people in that conversation or workspace.
        </Section>

        <Section title="4. Blocking and reporting">
          If you block someone, you're removed from each other's search results and feed — this
          works in both directions. Reports you file are visible only to moderators.
        </Section>

        <Section title="5. Data sharing">
          We don't sell your data. We share data with service providers only as needed to run the
          app — for example, an email provider to deliver password-reset and verification emails,
          and Expo's push notification service to deliver push notifications. We may disclose
          information if required by law.
        </Section>

        <Section title="6. Data retention and deletion">
          You can delete your own projects, reviews, and feed posts at any time from within the app,
          which removes them immediately. If you'd like your account and associated data fully
          deleted, contact support once available.
        </Section>

        <Section title="7. Security">
          Passwords are hashed, never stored in plain text. Password-reset and email-verification
          links use single-use tokens that expire and are invalidated once used.
        </Section>

        <Section title="8. Children">
          SCENE isn't directed at children under 16, and we don't knowingly collect data from them.
        </Section>

        <Section title="9. Changes to this policy">
          We may update this policy as the app evolves. Continued use of SCENE after a change means
          you accept the updated policy.
        </Section>

        <Section title="10. Contact">
          Questions about this policy can be sent through the app's support contact once available.
        </Section>
      </ScrollView>
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
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: Colors[colorScheme].text,
    fontSize: 24,
    fontWeight: '700',
  },
  effective: {
    color: Colors[colorScheme].muted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  section: {
    marginBottom: 18,
  },
  heading: {
    color: Colors[colorScheme].tint,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: Colors[colorScheme].text,
    fontSize: 14,
    lineHeight: 21,
  },
});
