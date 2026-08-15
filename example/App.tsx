import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatScreen } from './src/ChatScreen';
import { SettingsScreen } from './src/SettingsScreen';
import { SelectionScreen } from './src/SelectionScreen';
import { GemmaModelManagementScreen } from './src/GemmaModelManagementScreen';
import { SevenSegmentScreen } from './src/SevenSegmentScreen';
import { YoloModelManagementScreen } from './src/YoloModelManagementScreen';
import { ObjectDetectionScreen } from './src/ObjectDetectionScreen';
import { useTcbsColorStore } from '@tcbs/react-native-mazic-ui';
import { subraTheme } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const { currentThemeMode, setTcbsColor, themeColors } = useTcbsColorStore();

  React.useEffect(() => {
    setTcbsColor(subraTheme);
  }, [setTcbsColor]);

  const navigationTheme = React.useMemo(() => {
    const baseTheme = currentThemeMode === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: themeColors.primaryColor ?? themeColors.themeColor,
        background: themeColors.screenBgColor ?? baseTheme.colors.background,
        card: themeColors.modalHeaderBgColor ?? baseTheme.colors.card,
        text: themeColors.textPrimary ?? baseTheme.colors.text,
        border: themeColors.borderColor ?? baseTheme.colors.border,
      },
    };
  }, [currentThemeMode, themeColors]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar
          barStyle={
            currentThemeMode === 'dark' ? 'light-content' : 'dark-content'
          }
          backgroundColor={themeColors.screenBgColor}
        />
        <Stack.Navigator initialRouteName="Selection">
          <Stack.Screen
            name="Selection"
            component={SelectionScreen}
            options={{ headerShown: false, title: 'Home' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="SevenSegment"
            component={SevenSegmentScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ObjectDetection"
            component={ObjectDetectionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ModelManagement"
            component={GemmaModelManagementScreen}
            options={{ title: 'Model Management' }}
          />
          <Stack.Screen
            name="YoloModelManagement"
            component={YoloModelManagementScreen}
            options={{ title: 'YOLO Model Management' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
