import React from 'react';
import { Text, View, Animated, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const buttonData = [
    { title: 'My Records', navigateTo: 'Records', icon: 'albums' },
    { title: 'Settings', navigateTo: 'Settings', icon: 'settings' },
  ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.header}>Welcome to My Audio App</Text>
      <View style={styles.cardContainer}>
        {buttonData.map((button, index) => (
          <Pressable
            key={index}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? '#444' : '#999' },
            ]}
            onPress={() => navigation.navigate(button.navigateTo)}
          >
            <Ionicons name={button.icon} size={30} color="#fff" style={styles.icon} />
            <Text style={styles.cardText}>{button.title}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 30,
    marginVertical: 15,
    borderRadius: 10,
    width: '80%',
    elevation: 5, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  icon: {
    marginRight: 10,
  },
});

export default HomeScreen;
