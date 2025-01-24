import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import HomeScreen from './src/screens/HomeScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <NavigationContainer>
        <StatusBar backgroundColor='#124' style='light'/>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#124',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold', 
              fontSize: 20,
            },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Home' }} 
          />
          <Stack.Screen 
            name="Records" 
            component={RecordsScreen} 
            options={{ title: 'Records' }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{
              title: 'App Settings',
              headerStyle: { backgroundColor: '#FF5722' }, 
              headerTintColor: '#000',
            }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
};

export default App;
