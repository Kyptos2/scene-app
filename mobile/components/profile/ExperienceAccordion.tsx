import { StyleSheet, Text, View } from 'react-native';

import { AccordionSection } from '@/components/profile/AccordionSection';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius, Space } from '@/constants/Spacing';
import { Type } from '@/constants/Typography';
import type { UserProfile } from '@/lib/api';

function dedupeFestivals(profile: UserProfile) {
  const seen = new Map<string, { id: string; name: string; startDate: string }>();
  for (const credit of profile.credits) {
    for (const entry of credit.project.festivalFilms) {
      seen.set(entry.festival.id, entry.festival);
    }
  }
  return Array.from(seen.values());
}

export function ExperienceAccordion({ profile }: { profile: UserProfile }) {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme);
  const festivals = dedupeFestivals(profile);

  return (
    <View>
      <AccordionSection title="Director / DP Experience">
        {profile.directorDpExperience ? (
          <Text style={styles.paragraph}>{profile.directorDpExperience}</Text>
        ) : (
          <Text style={styles.empty}>No experience details added yet.</Text>
        )}
      </AccordionSection>

      <AccordionSection title="Technical Skills & Gear Owned">
        {profile.technicalSkills.length > 0 ? (
          <View style={styles.chipRow}>
            {profile.technicalSkills.map((skill) => (
              <View key={skill} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No skills or gear listed yet.</Text>
        )}
      </AccordionSection>

      <AccordionSection title="Past Accolades & Festival Screenings">
        <View style={styles.list}>
          {profile.accolades.map((accolade, index) => (
            <Text key={`accolade-${index}`} style={styles.listItem}>
              🏆 {accolade}
            </Text>
          ))}
          {festivals.map((festival) => (
            <Text key={festival.id} style={styles.listItem}>
              🎬 Screened at {festival.name}
            </Text>
          ))}
          {profile.accolades.length === 0 && festivals.length === 0 ? (
            <Text style={styles.empty}>No accolades or screenings yet.</Text>
          ) : null}
        </View>
      </AccordionSection>
    </View>
  );
}

const createStyles = (colorScheme: 'light' | 'dark') =>
  StyleSheet.create({
  paragraph: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
  empty: {
    color: Colors[colorScheme].muted,
    ...Type.body,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.xs + 2,
  },
  chip: {
    backgroundColor: Colors[colorScheme].card,
    borderColor: Colors[colorScheme].border,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm + 2,
    paddingVertical: Space.xs + 1,
  },
  chipText: {
    color: Colors[colorScheme].text,
    ...Type.body,
  },
  list: {
    gap: Space.xs + 2,
  },
  listItem: {
    color: Colors[colorScheme].text,
    ...Type.bodyLarge,
  },
});
