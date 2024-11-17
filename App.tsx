import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import HomeScreen from './src/screens/HomeScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { SettingsProvider } from './src/contexts/SettingsContext';

const Stack = createStackNavigator();

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: 'skyblue',
            },
            headerTintColor: '#333',
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
              // headerStyle: { backgroundColor: '#FF5722' }, 
              headerTintColor: '#FFFFFF',
            }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
};

export default App;
