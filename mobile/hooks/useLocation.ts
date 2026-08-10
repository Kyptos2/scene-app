import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import type { Coordinates } from '@/lib/api';

type LocationState = {
  coords: Coordinates | null;
  status: 'loading' | 'granted' | 'denied' | 'error';
};

export function useLocation() {
  const [state, setState] = useState<LocationState>({ coords: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setState({ coords: null, status: 'denied' });
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setState({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          status: 'granted',
        });
      } catch {
        if (!cancelled) setState({ coords: null, status: 'error' });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
