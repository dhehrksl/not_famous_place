import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Dimensions, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';
import { MapPin, Plus, Info, X } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [places, setPlaces] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState(null);
  const [placeName, setPlaceName] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location.coords);
      
      // Initial fetch of places
      fetchPlaces(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const fetchPlaces = async (lat, lng) => {
    // Mocking API call for now
    const mockPlaces = [
      { id: 1, name: '비밀 아지트', lat: lat + 0.002, lng: lng + 0.002, status: 'ACTIVE', review_count: 50 },
      { id: 2, name: '조용한 카페', lat: lat - 0.002, lng: lng - 0.002, status: 'ACTIVE', review_count: 120 },
    ];
    setPlaces(mockPlaces);
  };

  const handleLongPress = (e) => {
    setSelectedCoord(e.nativeEvent.coordinate);
    setModalVisible(true);
  };

  const handleAddPlace = () => {
    if (!placeName.trim()) {
      Alert.alert('오류', '장소 이름을 입력해주세요.');
      return;
    }

    const newPlace = {
      id: Date.now(),
      name: placeName,
      lat: selectedCoord.latitude,
      lng: selectedCoord.longitude,
      status: 'ACTIVE',
      review_count: 0
    };

    setPlaces([...places, newPlace]);
    setPlaceName('');
    setModalVisible(false);
    Alert.alert('성공', '비밀 장소가 등록되었습니다.');
  };

  const handleMarkerPress = (place) => {
    Alert.alert(place.name, `리뷰 수: ${place.review_count}\n폭파까지 ${500 - place.review_count}개 남음`);
  };

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onLongPress={handleLongPress}
          showsUserLocation={true}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              title={place.name}
              onPress={() => handleMarkerPress(place)}
            >
              <View style={styles.markerContainer}>
                <MapPin size={32} color="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text>지도를 불러오는 중...</Text>
        </View>
      )}

      {/* UI Overlays */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>언더그라운드</Text>
        <Text style={styles.headerSubtitle}>나만 알고 싶은 비밀 지도</Text>
      </View>

      <TouchableOpacity style={styles.infoButton}>
        <Info color="white" size={24} />
      </TouchableOpacity>

      {/* Add Place Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새로운 장소 등록</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="장소 이름을 입력하세요"
              value={placeName}
              onChangeText={setPlaceName}
              autoFocus={true}
            />
            
            <TouchableOpacity style={styles.submitButton} onPress={handleAddPlace}>
              <Text style={styles.submitButtonText}>비밀 장소로 만들기</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalHint}>
              * 리뷰가 500개가 넘으면 이 지도는 폭파되어 사라집니다.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button Hint */}
      <View style={styles.fabHint}>
        <Plus color="white" size={20} />
        <Text style={styles.fabHintText}>지도를 길게 눌러 장소 등록</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: width,
    height: height,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e1b4b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#4338ca',
    marginTop: 2,
  },
  infoButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalHint: {
    marginTop: 15,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  fabHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 27, 75, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  fabHintText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
});
