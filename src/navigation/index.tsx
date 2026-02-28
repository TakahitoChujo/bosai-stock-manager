import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { Colors } from '../constants/colors';

import HomeScreen from '../screens/HomeScreen';
import ItemListScreen from '../screens/ItemListScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import AlertScreen from '../screens/AlertScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useStore } from '../store/useStore';

export type RootStackParamList = {
  Main: undefined;
  Onboarding: undefined;
  AddItem: { category?: string; editItemId?: number } | undefined;
  ItemDetail: { itemId: number };
};

export type TabParamList = {
  ホーム: undefined;
  備蓄品一覧: undefined;
  アラート: undefined;
  設定: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 20 }}>{emoji}</Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.subText,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="ホーム"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="備蓄品一覧"
        component={ItemListScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="アラート"
        component={AlertScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} /> }}
      />
      <Tab.Screen
        name="設定"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const settings = useStore((s) => s.settings);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!settings.isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AddItem"
              component={AddItemScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.editItemId ? '備蓄品を編集' : '備蓄品を追加',
                headerStyle: { backgroundColor: Colors.primary },
                headerTintColor: '#fff',
                presentation: 'modal',
              })}
            />
            <Stack.Screen
              name="ItemDetail"
              component={ItemDetailScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.text,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
