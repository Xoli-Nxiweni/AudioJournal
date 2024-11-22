import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity, StyleSheet, Alert, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { AuthProvider } from './src/contexts/AuthContext';

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); 

  const handleLogout = async (navigation: any) => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            setIsAuthenticated(false);
            navigation.replace('Auth');
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <AuthProvider>
      <SettingsProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={isAuthenticated ? 'Home' : 'Auth'}
            screenOptions={{
              headerStyle: {
                backgroundColor: 'skyblue',
              },
              headerTintColor: '#000',
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 20,
              },
              headerBackTitleVisible: false,
              gestureEnabled: true, 
              cardOverlayEnabled: true,
              cardStyle: { backgroundColor: '#fff' },
            }}
          >
            {/* Auth Screen */}
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />

            {/* Home Screen */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: 'Home',
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('Settings')}
                  >
                    <Ionicons name="ellipsis-vertical" size={24} color="black" />
                  </TouchableOpacity>
                ),
                // Custom transition animation for screen change
                transitionSpec: {
                  open: {
                    animation: 'timing',
                    config: {
                      duration: 400, // Customize duration of the transition
                      easing: Easing.inOut(Easing.ease),
                    },
                  },
                  close: {
                    animation: 'timing',
                    config: {
                      duration: 400,
                      easing: Easing.inOut(Easing.ease),
                    },
                  },
                },
                cardStyleInterpolator: ({ current, next, layouts }) => {
                  const opacity = current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  });

                  return {
                    cardStyle: {
                      opacity,
                    },
                  };
                },
              })}
            />

            {/* Records Screen */}
            <Stack.Screen
              name="Records"
              component={RecordsScreen}
              options={({ navigation }) => ({
                title: 'Records',
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('Settings')}
                  >
                    <Ionicons name="ellipsis-vertical" size={24} color="black" />
                  </TouchableOpacity>
                ),
              })}
            />

            {/* Settings Screen */}
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={({ navigation }) => ({
                title: 'App Settings',
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleLogout(navigation)}
                  >
                    <Ionicons name="log-out-outline" size={24} color="black" />
                  </TouchableOpacity>
                ),
              })}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SettingsProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    marginRight: 15, 
  },
});

export default App;
