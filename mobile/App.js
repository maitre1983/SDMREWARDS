/**
 * SDM REWARDS Mobile App
 * Main Navigation Structure
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { COLORS } from './src/utils/constants';

// Auth Screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';

// Client Screens
import ClientHomeScreen from './src/screens/client/HomeScreen';
import QRScannerScreen from './src/screens/client/QRScannerScreen';
import PartnersScreen from './src/screens/client/PartnersScreen';
import HistoryScreen from './src/screens/client/HistoryScreen';
import ReferralsScreen from './src/screens/client/ReferralsScreen';
import ServicesScreen from './src/screens/client/ServicesScreen';
import WithdrawalScreen from './src/screens/client/WithdrawalScreen';
import ProfileScreen from './src/screens/client/ProfileScreen';
import CardScreen from './src/screens/client/CardScreen';
import ContactsScreen from './src/screens/client/ContactsScreen';
import MissionsScreen from './src/screens/client/MissionsScreen';
import ReferralScreen from './src/screens/client/ReferralScreen';
import AIAssistantScreen from './src/screens/client/AIAssistantScreen';

// Merchant Screens
import MerchantHomeScreen from './src/screens/merchant/HomeScreen';
import MerchantHistoryScreen from './src/screens/merchant/HistoryScreen';
import MerchantSettingsScreen from './src/screens/merchant/SettingsScreen';
import MerchantCashPaymentScreen from './src/screens/merchant/CashPaymentScreen';

// Placeholder component for screens not yet implemented
const PlaceholderScreen = ({ route }) => (
  <View style={styles.placeholder}>
    <Ionicons name="construct-outline" size={64} color={COLORS.textMuted} />
    <Text style={styles.placeholderTitle}>{route.name}</Text>
    <Text style={styles.placeholderText}>Coming Soon</Text>
  </View>
);

// Shared Screens - No more placeholders needed

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Client Stack Navigator (HomeScreen has its own bottom navigation)
function ClientMainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={ClientHomeScreen} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} />
      <Stack.Screen name="Partners" component={PartnersScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
      <Stack.Screen name="CardDetails" component={CardScreen} />
      <Stack.Screen name="Cards" component={CardScreen} />
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="Missions" component={MissionsScreen} />
      <Stack.Screen name="ReferralShare" component={ReferralScreen} />
      <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
    </Stack.Navigator>
  );
}

// Merchant Tab Navigator
function MerchantTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'History':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Profile':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={MerchantHomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Client Stack Navigator
function ClientStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientMain" component={ClientMainNavigator} />
    </Stack.Navigator>
  );
}

// Merchant Stack Navigator (HomeScreen has its own bottom navigation)
function MerchantMainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={MerchantHomeScreen} />
      <Stack.Screen name="MerchantTransactions" component={MerchantHistoryScreen} />
      <Stack.Screen name="MerchantSettings" component={MerchantSettingsScreen} />
      <Stack.Screen name="MerchantCashPayment" component={MerchantCashPaymentScreen} />
    </Stack.Navigator>
  );
}

// Merchant Stack Navigator
function MerchantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MerchantMain" component={MerchantMainNavigator} />
    </Stack.Navigator>
  );
}

// Main Navigation
function Navigation() {
  const { isLoading, isAuthenticated, userType } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack />
      ) : userType === 'merchant' ? (
        <MerchantStack />
      ) : (
        <ClientStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  tabBar: {
    backgroundColor: COLORS.backgroundLight,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 8,
    height: 85,
    paddingBottom: 25,
  },
  placeholder: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 8,
  },
});
