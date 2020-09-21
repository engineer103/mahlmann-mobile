import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  Button,
  Dimensions,
  TouchableOpacity
} from "react-native";
import CheckBox from '@react-native-community/checkbox';
import MapView, {
  MAP_TYPES, Marker,
  Callout,
  Polygon,
  ProviderPropType,
  PROVIDER_GOOGLE
} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

import Geolocation from 'react-native-geolocation-service';
import { getFields, createComment, setField, getComments, getGroups } from '../api/fields';
import { getToken, setToken } from '../api/token';
import { GOOGLE_MAPS_API_KEY } from '../../secrets';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE = 52.8246310;
const LONGITUDE = 8.1316168;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
let id = 0;

class Home extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      region: {
        latitude: LATITUDE,
        longitude: LONGITUDE,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      },
      admin: false,
      polygons: [],
      measuring: null,
      measuringStatus: false,
      fields: [],
      users: [], 
      hasLoadedFields: false, 
      fieldLoadingErrorMessage: '', 
      initialRegion: {}, 
      currentField: {}, 
      selectedRegion: null,
      showFieldWindow: true,
      grouping: false,
      showSetWindow: false,
      fieldsGroup: [],
      setUserIds: [],
      showSearchWindow: false,
      showInboxWindow: false,
      searchedFields: [],
      inboxFieldGropupIds: [],
      inboxFields: [],
      showRoute: false,
      fieldComments: [],
      inboxGroups: [],
      selectedAreaSize: null,
    };
  }

  checkAdminUser = async () => {
    const token = await getToken();

    if (token && token.admin == 'true') {
      this.setState({
        admin: true,
      })
    } else {
      this.setState({
        admin: false,
      })
    }
  }

  loadFields() {
    this.setState({ hasLoadedFields: false, fieldLoadingErrorMessage: '' });
    getFields()
      .then((res) => {
        this.setState({
          hasLoadedFields: true,
          fields: res.fields,
          currentField: res.fields[0],
          users: res.users,
          inboxFieldGropupIds: res.groupIds
        });
      }
    )
    .catch(this.handleFieldLoadingError);
  }

  handleFieldLoadingError = (res) => {
    if (res.error === 401) {
      this.props.navigation.navigate('Login');
    } else {
      this.setState({
        hasLoadedFields: false,
        fieldLoadingErrorMessage: res.message,
      });
    }
  }

  componentDidMount() {
    this.loadFields();
    this.checkAdminUser();
    // if (hasLocationPermission) {
      // Geolocation.getCurrentPosition(
      //     (position) => {
      //       console.log(position);
      //       this.setState({
      //         initialRegion: {
      //           latitude: position.coords.latitude,
      //           longitude: position.coords.longitude,
      //           latitudeDelta: 0.0922,
      //           longitudeDelta: 0.0421,
      //         },
      //       });
      //     },
      //     (error) => {
      //       // See error code charts below.
      //       console.log(error.code, error.message);
      //     },
      //     { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      // );
    // }
  }

  rad(coord) {
    return (coord * Math.PI) / 180;
  }

  calculateAreaSize(coords) {
    let area = 0;
    let len = coords.length;
    const r = 6378137;
    let lowerIndex = null;
    let middleIndex = null;
    let upperIndex = null;

    for(let i = 0; i < len; i++) {
      if (i === len - 2) {
        lowerIndex = len - 2;
        middleIndex = len - 1;
        upperIndex = 0;
      } else if (i === len - 1) {
        lowerIndex = len - 1;
        middleIndex = 0;
        upperIndex = 1;
      } else {
        lowerIndex = i;
        middleIndex = i + 1;
        upperIndex = i + 2;
      }

      let p1 = coords[lowerIndex];
      let p2 = coords[middleIndex];
      let p3 = coords[upperIndex];

      let a = (this.rad(p3.longitude) - this.rad(p1.longitude)) * Math.sin(this.rad(p2.latitude));

      area += a
    }

    area = (area * r * r) * 0.0001 / 2

    return Math.abs(area.toFixed(2));
  }

  logOut = async () => {
    await setToken({});
    this.props.navigation.navigate('Login');
  };

  getColorByIndex(field) {
    let color = 'green';
    if (this.state.searchedFields.indexOf(field) != -1) {
      color = 'yellow';
    }
    if (this.state.inboxFields.indexOf(field) != -1) {
      color = 'purple';
    }
    if (this.state.selectedRegion === field || this.state.fieldsGroup.indexOf(field) != -1) {
      color = 'red';
    }

    return color;
  }

  // onMapPress(nativeEvent) {
  //   if (nativeEvent.action !== 'polygon-press') {
  //     this.setState({selectedRegion: null});
  //   }
  // }

  toggleMeasure() {
    if (this.state.measuringStatus) {
      this.setState({
        measuringStatus: false,
      });
    } else {
      this.setState({
        measuringStatus: true,
        measuring: null,
        selectedAreaSize: null,
      });
    }
  }

  onMapPress(e) {
    if (this.state.measuringStatus && e.nativeEvent.action != "polygon-press") {
      const { measuring } = this.state;
      if (!measuring) {
        this.setState({
          measuring: {
            id: id++,
            coordinates: [e.nativeEvent.coordinate],
          },
        });
      } else {
        let coordinates = [...this.state.measuring.coordinates, e.nativeEvent.coordinate]
        this.setState({
          measuring: {
            ...measuring,
            coordinates: coordinates,
          },
        });

        if (coordinates.length > 2) {
          this.setState({
            selectedAreaSize: this.calculateAreaSize(coordinates)
          })
        }
      }
    }
  }

  onPolygonPress(e, field) {
    if (!this.state.measuringStatus) {
      this.setState({
        fieldComments: []
      });

      const { fieldsGroup } = this.state;
      if (!this.state.grouping) {
        this.setState({
          selectedRegion: field,
          showFieldWindow: true,
        });

        getComments(field.id)
          .then((res) => {
            this.setState({
              fieldComments: res.comments
            });
          }
        )
      } else {
        if (fieldsGroup.indexOf(field) == -1) {
          this.setState({
            fieldsGroup: [...fieldsGroup, field]
          })
        }
      }
    }
  }

  closeFieldWindow() {
    this.setState({
      showFieldWindow: false,
    });
  }

  commentSubmit(text) {
    const { selectedRegion, fieldComments } = this.state;

    createComment(selectedRegion.id, text)
      .then((res) => {
        this.setState({
          fieldComments: [...fieldComments, res],
        });
      }
    )

    this.commentTextInput.clear();
  }

  handleGroup() {
    const { selectedRegion } = this.state;
    if (this.state.grouping) {
      this.setState({
        grouping: false,
        showSetWindow: true,
      });
    } else {
      this.setState({
        grouping: true,
        showSetWindow: false,
        fieldsGroup: [this.state.selectedRegion],
      });
    }
  }

  onChangeCheckbox(checked, user) {
    let userIds = this.state.setUserIds;

    if (checked && this.state.setUserIds.indexOf(user.id) == -1) {
      userIds.push(user.id)
      this.setState({
        setUserIds: userIds,
      });
    } else if (!checked) {
      userIds.splice(userIds.indexOf(user.id), 1)
      this.setState({
        setUserIds: userIds,
      });
    }
  }

  setSubmit() {
    let fieldIds = this.state.fieldsGroup.map(fg => (fg.id))
    setField(this.state.setUserIds, fieldIds)
      .then((res) => {
        this.setState({
          showSetWindow: false,
          fieldsGroup: [],
        })
      }
    )
  }

  cancelSet() {
    this.setState({
      grouping: false,
      showSetWindow: false,
      fieldsGroup: [],
    })
  }

  onSearchTouchable() {
    if (this.state.showSearchWindow) {
      this.setState({
        showSearchWindow: false,
      })
    } else {
      this.setState({
        showSearchWindow: true,
      })
    }
  }

  onInboxTouchable() {
    if (this.state.showInboxWindow) {
      this.setState({
        showInboxWindow: false,
      })
    } else {
      this.setState({
        showInboxWindow: true,
      })

      getGroups()
        .then((res) => {
          this.setState({
            inboxGroups: res.groupIds
          });
        }
      )
    }
  }

  searchSubmit(text) {
    let result = []

    this.state.fields.map((field) => {
      if (field.name.toLowerCase().search(text.toLowerCase().trim()) > 0) {
        result.push(field)
      }
    })

    this.setState({
      searchedFields: result,
    });
  }

  renderInboxField(fieldIds) {
    let result = [];
    this.state.fields.map((field) => {
      if (fieldIds.indexOf(field.id) != -1) {
        result.push(field)
      }
    })
    this.setState({
      inboxFields: result,
    });
  }

  logOut = async () => {
    await setToken({});
    this.props.navigation.navigate('Login');
  };

  toggleRoute() {
    if (this.state.showRoute) {
      this.setState({
        showRoute: false,
      })
    } else {
      this.setState({
        showRoute: true,
      })
    }
  }


  render() {
    const { fields, fieldLoadingErrorMessage, initialRegion,  hasLoadedFields } = this.state;

    const mapOptions = {
      scrollEnabled: true,
    };

    if (this.state.measuring) {
      mapOptions.scrollEnabled = false;
      // mapOptions.onPanDrag = e => this.onPress(e);
    }

    if (hasLoadedFields) {
      return (
        <View style={styles.container}>
          <MapView
            provider={this.props.provider}
            // provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={this.state.region}
            // mapType='satellite'
            showsUserLocation={true}
            onPress={e => this.onMapPress(e)}
            {...mapOptions}
          >
            <Marker
              coordinate={this.state.region}
            />
            {fields.map((field) => (
              <Polygon
                coordinates={field.coordinates}
                fillColor={this.getColorByIndex(field)}
                strokeColor={this.getColorByIndex(field)}
                strokeWidth={2}
                key={field.id}
                tappable={true}
                onPress={(e) => this.onPolygonPress(e, field)}
              />
            ))}
            {this.state.polygons.map(polygon => (
              <Polygon
                key={polygon.id}
                coordinates={polygon.coordinates}
                strokeColor="#F00"
                fillColor="rgba(255,0,0,0.5)"
                strokeWidth={1}
              />
            ))}
            {this.state.measuring && (
              <Polygon
                key={this.state.measuring.id}
                coordinates={this.state.measuring.coordinates}
                strokeColor="#000"
                fillColor="rgba(255,0,0,0.5)"
                strokeWidth={1}
              />
            )}
            {this.state.selectedRegion && this.state.showRoute && (
              <MapViewDirections
                origin={{latitude: 52.8246310, longitude: 8.1316168}}
                destination={this.state.selectedRegion.coordinates[0]}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={3}
                strokeColor="hotpink"
              />
            )}
          </MapView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => this.toggleMeasure()}
              style={[styles.bubble, styles.button]}
            >
              <Text>{this.state.measuringStatus ? 'Messung beenden' : 'Messung starten'}</Text>
            </TouchableOpacity>
            {this.state.selectedRegion && this.state.admin && (
              <TouchableOpacity
                onPress={() => this.handleGroup()}
                style={[styles.bubble, styles.button]}
              >
                <Text>{this.state.grouping ? 'Satz erzeugen' : 'Satz auswählen'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => this.onSearchTouchable()}
              style={[styles.bubble, styles.button]}
            >
              <Text>Felder suchen</Text>
            </TouchableOpacity>
            {!this.state.admin && (
              <TouchableOpacity
                onPress={() => this.onInboxTouchable()}
                style={[styles.bubble, styles.button]}
              >
                <Text>Satz Inbox</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={this.logOut}
              style={[styles.bubble, styles.button]}
            >
              <Text>Ausloggen</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.fieldWindow}>
            {this.state.selectedRegion && this.state.showFieldWindow && (
              <TouchableOpacity
                onPress={() => this.closeFieldWindow()}
                style={[styles.bubble]}
              >
                <Button
                  title={this.state.showRoute ? 'Route ausblenden' : 'Route anzeigen'}
                  onPress={ () => this.toggleRoute() } 
                />
                <Text>Name: {this.state.selectedRegion.name}</Text>
                <Text>Status: {this.state.selectedRegion.status}</Text>
                <Text>Kohlfähigkeit: {this.state.selectedRegion.is_cabbage}</Text>
                <Text>Fläche: {this.state.selectedRegion.area_size} ha</Text>
                {this.state.fieldComments.map(comment => (
                  <Text key={comment.id}>{comment.user}: {comment.text}</Text>
                ))}
                <TextInput
                  style={[styles.textInput]}
                  ref={input => { this.commentTextInput = input }}
                  clearButtonMode="always"
                  onSubmitEditing={ (event) => this.commentSubmit(event.nativeEvent.text) } 
                />
              </TouchableOpacity>
            )}
          </ScrollView>
          <ScrollView style={styles.fieldWindow}>
            {!this.state.grouping && this.state.showSetWindow && (
              <TouchableOpacity
                // onPress={() => this.closeSetWindow()}
                style={[styles.bubble]}
              >
                {this.state.users.map(user => (
                  <View
                    style={styles.checkboxContainer}
                    key={'checkbox-container-' + user.id}
                  >
                    <CheckBox
                      style={styles.checkbox}
                      key={'checkbox-' + user.id}
                      onValueChange={(e) => this.onChangeCheckbox(e, user)}
                    />
                    <Text
                      style={styles.label}
                      key={'checkbox-label-' + user.id}
                    >{user.email}</Text>
                  </View>
                ))}
                <Button
                  title="Satz versenden"
                  onPress={ () => this.setSubmit() } 
                />
                <Button
                  title="Abbrechen"
                  onPress={ () => this.cancelSet() } 
                />
              </TouchableOpacity>
            )}
          </ScrollView>
          <View style={styles.fieldWindow}>
            {this.state.showSearchWindow && (
              <TouchableOpacity
                style={[styles.bubble]}
              >
                <TextInput
                  style={styles.searchText}
                  onSubmitEditing={ (event) => this.searchSubmit(event.nativeEvent.text) } 
                />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.fieldWindow}>
            {this.state.showInboxWindow && (
              <TouchableOpacity
                style={[styles.bubble]}
              >
                {this.state.inboxFieldGropupIds.length == 0 && (
                  <Text>No sets.</Text>
                )}
                {this.state.inboxGroups.map((fieldGroup, index) => (
                  <Text
                    key={'fieldgroup-' + index}
                    onPress={() => this.renderInboxField(fieldGroup)}
                  >
                    Satz-{index+1}
                  </Text>
                ))}
              </TouchableOpacity>
            )}
          </ScrollView>
          {this.state.selectedAreaSize && (
            <View>
              <TouchableOpacity
                style={[styles.bubble, styles.infoButton]}
              >
                <Text>{this.state.selectedAreaSize} ha</Text>
              </TouchableOpacity>
            </View>
            )}
        </View>
      );  
    } else {
      return <Text>Loading...</Text>
    }
  }
}

Home.propTypes = {
  provider: ProviderPropType,
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  latlng: {
    width: 200,
    alignItems: 'stretch',
  },
  button: {
    width: 80,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  infoButton: {
    width: 100,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: 'transparent',
  },
  fieldWindow: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  checkbox: {
    alignSelf: "center",
  },
  label: {
    margin: 8,
  },
  searchWindow: {
    flex: 1,
  },
  searchText: {
    height: 30,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200
  },
  textInput: {
    height: 20,
    borderColor: 'gray',
    borderWidth: 1
  },
});

export default Home;
