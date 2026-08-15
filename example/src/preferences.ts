import { createMMKV } from 'react-native-mmkv';

export const preferencesStorage = createMMKV({ id: 'subra-ai-preferences' });

export const SPEAK_RESPONSES_KEY = 'speak-responses';
