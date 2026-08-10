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

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerStyle: { backgroundColor: Colors[colorScheme].background },
          headerTintColor: Colors[colorScheme].text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.effective}>Effective {EFFECTIVE_DATE}</Text>

        <Section title="1. Agreement">
          These Terms of Service govern your use of SCENE, a networking and collaboration app for
          filmmakers and production professionals. By creating an account you agree to these terms.
          If you don't agree, don't use SCENE.
        </Section>

        <Section title="2. Who can use SCENE">
          You must be at least 16 years old and able to form a binding contract to create an account.
          You're responsible for the accuracy of the information on your profile, including your
          project credits and role claims.
        </Section>

        <Section title="3. Your account">
          You're responsible for keeping your password secure and for all activity under your
          account. Tell us right away if you suspect unauthorized access. One person, one account —
          don't create accounts on behalf of others without permission.
        </Section>

        <Section title="4. Content you post">
          You keep ownership of what you post — project details, crew call listings, reviews, feed
          updates, messages, and photos. By posting, you grant SCENE a license to host, display, and
          distribute that content within the app so other users can see it. You're responsible for
          having the rights to anything you post, including project stills, posters, and footage
          links.
        </Section>

        <Section title="5. Conduct">
          Don't use SCENE to harass, impersonate, defraud, or misrepresent your professional
          credits. Don't post spam, malware, or content that infringes someone else's rights. Crew
          calls and applications must be genuine — don't post fake listings or apply in bad faith.
          Violating these rules can result in content removal, suspension, or account termination.
        </Section>

        <Section title="6. Reporting and moderation">
          SCENE lets users report profiles, projects, reviews, and posts, and lets you block another
          user directly. We review reports and may remove content or restrict accounts that violate
          these terms, at our discretion.
        </Section>

        <Section title="7. Location and proximity features">
          Some features — nearby crew calls, festival collaborations, proximity handshakes — use
          your device's location. You can decline location access; those features just won't work
          without it. We don't share your precise location with other users beyond what a feature
          explicitly displays (e.g. distance in km).
        </Section>

        <Section title="8. Termination">
          You can delete content you've posted (projects, reviews, feed posts) at any time from
          within the app. You may stop using SCENE at any time. We may suspend or terminate accounts
          that violate these terms.
        </Section>

        <Section title="9. Disclaimers">
          SCENE is provided "as is." We don't verify every credit or claim a user makes, and we
          don't guarantee any crew call, connection, or collaboration will lead to paid work or a
          finished project. Use your own judgment before entering agreements with people you meet
          through the app.
        </Section>

        <Section title="10. Changes">
          We may update these terms as the app evolves. Continued use of SCENE after a change means
          you accept the updated terms.
        </Section>

        <Section title="11. Contact">
          Questions about these terms can be sent through the app's support contact once available.
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
