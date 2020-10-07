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
import { showMessage, hideMessage } from "react-native-flash-message";

import Geolocation from 'react-native-geolocation-service';
import { getFields, createComment, setField, getComments, getGroups } from '../api/fields';
import { getToken, setToken } from '../api/token';
import { GOOGLE_MAPS_API_KEY } from '../../secrets';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE = 52.8246310;
const LONGITUDE = 8.1316168;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
let id = 0;

class Home extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      region: {},
      initialMapRegion: {
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
      currentField: {}, 
      selectedRegion: null,
      showFieldWindow: true,
      grouping: false,
      showSetWindow: false,
      fieldsGroup: [],
      showSearchWindow: false,
      showInboxWindow: false,
      searchedFields: [],
      inboxFieldGropupIds: [],
      inboxFields: [],
      showRoute: false,
      fieldComments: [],
      inboxGroups: [],
      selectedAreaSize: null,
      driverLocation: {},
      hasDriverLocation: false,
      setName: null,
      showFieldLabel: true,
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
      Geolocation.getCurrentPosition(
          (position) => {
            console.log(position);
            this.setState({
              region: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              },
            });

            this.setState({
              initialMapRegion: this.state.region,
            });
          },
          (error) => {
            // See error code charts below.
            console.log(error.code, error.message);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );

      Geolocation.watchPosition(
        (position) => {
          this.setState({
            driverLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            },
            hasDriverLocation: true,
          });
        });

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
      color = 'orange';
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
        measuring: null,
        selectedAreaSize: null,
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
          showSetWindow: false,
          showSearchWindow: false,
          showInboxWindow: false,
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
        if (res.status == 'success') {
          this.setState({
            fieldComments: [...fieldComments, res.body],
          });
        }
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
        showFieldWindow: false,
        showSearchWindow: false,
        showInboxWindow: false,
      });
    } else {
      this.setState({
        grouping: true,
        showSetWindow: false,
        fieldsGroup: [this.state.selectedRegion],
      });
    }
  }

  handleSetName(name) {
    this.setState({
      setName: name
    })
  }

  setSubmit() {
    let fieldIds = this.state.fieldsGroup.map(fg => (fg.id))
    setField(this.state.setName, fieldIds)
      .then((res) => {
        this.setState({
          showSetWindow: false,
          fieldsGroup: [],
        })

        showMessage({
          message: "Der Satz wurde erfolgreich erstellt.",
          type: "success",
        });
      }
    )

    this.setNameTextInput.clear();
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
        showFieldWindow: false,
        showSetWindow: false,
        showInboxWindow: false,
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
        showFieldWindow: false,
        showSetWindow: false,
        showSearchWindow: false,
      })

      getGroups()
        .then((res) => {
          console.log('step 1')
          console.log(res)
          this.setState({
            inboxGroups: res.groups
          });
        }
      )
    }
  }

  searchSubmit(text) {
    let result = []

    this.state.fields.map((field) => {
      if (field.name.toLowerCase().search(text.toLowerCase().trim()) != -1) {
        result.push(field)
      }
    })

    this.setState({
      searchedFields: result,
      showSearchWindow: false,
    });

    if (result.length > 0) {
      let field = result[0]

      this.map.animateToRegion({
        ...this.state.initialMapRegion,
        latitude: field.coordinates[0].latitude,
        longitude: field.coordinates[0].longitude,
      })
    } else {
      showMessage({
        message: "Die Suche ergab keinen Treffer.",
        type: "error",
      });
    }
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

  removeSelectedAreaPoint() {
    let coordinates = [...this.state.measuring.coordinates]
    coordinates.splice(-1)

    this.setState({
      measuring: {
        ...this.state.measuring,
        coordinates: coordinates,
      },
    });

    if (coordinates.length > 2) {
      this.setState({
        selectedAreaSize: this.calculateAreaSize(coordinates)
      })
    } else {
      this.setState({
        selectedAreaSize: null,
      })
    }
  }

  onRegionChangeComplete(region) {
    if (region.latitudeDelta <= 0.021) {
      this.setState({
        showFieldLabel: true
      })
    } else {
      this.setState({
        showFieldLabel: false
      })
    }
  }

  render() {
    const { fields, fieldLoadingErrorMessage, region, initialMapRegion, measuring, hasLoadedFields, hasDriverLocation } = this.state;

    const mapOptions = {
      scrollEnabled: true,
    };

    if (this.state.measuringStatus) {
      // mapOptions.scrollEnabled = false;
      // mapOptions.onPanDrag = e => this.onPress(e);
    }

    let measuring_coordinates = (measuring && measuring.coordinates) || []

    if (hasLoadedFields) {
      return (
        <View style={styles.container}>
          <MapView
            ref={map => {this.map = map}}
            provider={this.props.provider}
            // provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialMapRegion}
            // mapType='satellite'
            showsUserLocation={true}
            onPress={e => this.onMapPress(e)}
            zoomControlEnabled={true}
            onRegionChangeComplete={(region)=>this.onRegionChangeComplete(region)}
            {...mapOptions}
          >
            {region.latitude && (
              <Marker
                coordinate={region}
              />
            )}
            {this.state.hasDriverLocation && (
              <Marker
                coordinate={this.state.driverLocation}
              />
            )}
            {fields.map((field) => (
              <Polygon
                coordinates={field.coordinates}
                fillColor={this.getColorByIndex(field)}
                strokeColor='lightblue'
                strokeWidth={4}
                key={field.id}
                tappable={true}
                onPress={(e) => this.onPolygonPress(e, field)}
              />
            ))}
            {this.state.showFieldLabel && fields.map((field) => (
              <Marker 
                coordinate={field.coordinates[0]}
                key={field.id}
              >
                <Text
                  note
                  style={{color:"#000", fontSize: 12}}
                  key={field.id}
                >
                  {field.name + '(' + field.area_size + ' ha)'}
                </Text>
              </Marker>
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
            {measuring_coordinates.map(coordinate => (
              <Marker
                key={coordinate.latitude + '-' + coordinate.longitude}
                coordinate={coordinate}
              />
            ))}
            {this.state.selectedRegion && this.state.showRoute && (
              <MapViewDirections
                // origin={{latitude: 52.8246310, longitude: 8.1316168}}
                origin={region}
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
            <TouchableOpacity
              onPress={() => this.onInboxTouchable()}
              style={[styles.bubble, styles.button]}
            >
              <Text>Satz Inbox</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={this.logOut}
              style={[styles.bubble, styles.button]}
            >
              <Text>Ausloggen</Text>
            </TouchableOpacity>
          </View>
          {this.state.selectedRegion && this.state.showFieldWindow && (
            <View style={styles.metaInfoWindow}>
              <Button
                title={this.state.showRoute ? 'Route ausblenden' : 'Route anzeigen'}
                onPress={ () => this.toggleRoute() }
              />
              <View style={styles.metaMainView}>
                <Text style={styles.metaTagName}>Name: <Text style={styles.metaTagContent}>{this.state.selectedRegion.name}</Text></Text>
                <Text style={styles.metaTagName}>Status: <Text style={styles.metaTagContent}>{this.state.selectedRegion.status}</Text></Text>
                <Text style={styles.metaTagName}>Kohlfähigkeit: <Text style={styles.metaTagContent}>{this.state.selectedRegion.is_cabbage}</Text></Text>
                <Text style={styles.metaTagName}>Fläche: <Text style={styles.metaTagContent}>{this.state.selectedRegion.area_size} ha</Text></Text>
              </View>
              <Text style={{color: 'gray'}}>Comments</Text>
              <View style={{height: 80}} >
                <ScrollView>
                  {this.state.fieldComments.map(comment => (
                    <Text key={comment.id}>{comment.user}: {comment.text}</Text>
                  ))}
                </ScrollView>
              </View>
              <TextInput
                style={[styles.textInput]}
                ref={input => { this.commentTextInput = input }}
                clearButtonMode="always"
                placeholder="Comment"
                onSubmitEditing={ (event) => this.commentSubmit(event.nativeEvent.text) }
              />
              <Button
                title='Schließen'
                onPress={() => this.closeFieldWindow()}
              />
            </View>
          )}
          {!this.state.grouping && this.state.showSetWindow && (
            <View style={styles.metaInfoWindow}>
              <TextInput
                style={[styles.textInput]}
                clearButtonMode="always"
                placeholder="Name"
                ref={input => { this.setNameTextInput = input }}
                onChangeText={(name) => this.handleSetName(name)}
              />
              <Button
                title="Satz versenden"
                onPress={ () => this.setSubmit() } 
              />
              <Button
                title="Abbrechen"
                onPress={ () => this.cancelSet() } 
              />
            </View>
          )}
          <View style={styles.searchWindow}>
            {this.state.showSearchWindow && (
              <TouchableOpacity
                style={[styles.bubble]}
              >
                <TextInput
                  style={styles.searchText}
                  placeholder="Suche"
                  onSubmitEditing={ (event) => this.searchSubmit(event.nativeEvent.text) } 
                />
              </TouchableOpacity>
            )}
          </View>
          {this.state.showInboxWindow && (
            <ScrollView style={styles.metaInfoWindow}>
              {this.state.inboxGroups.length == 0 && (
                <Text>No sets.</Text>
              )}
              {this.state.inboxGroups.map((fieldGroup, index) => (
                <Text
                  key={fieldGroup.id}
                  onPress={() => this.renderInboxField(fieldGroup.fieldIds)}
                  style={{margin: 8}}
                >
                  {fieldGroup.name}
                </Text>
              ))}
            </ScrollView>
          )}
          <View style={styles.buttonContainer}>
            {this.state.selectedAreaSize && (
              <View>
                <TouchableOpacity
                  style={[styles.bubble, styles.infoButton]}
                >
                  <Text>{this.state.selectedAreaSize} ha</Text>
                </TouchableOpacity>
              </View>
            )}
            {measuring_coordinates.length > 0 && (
              <View>
                <TouchableOpacity
                  onPress={() => this.removeSelectedAreaPoint()}
                  style={[styles.bubble, styles.button]}
                >
                  <Text>Zurück</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    flex: 2,
  },
  searchText: {
    height: 30,
    borderColor: 'gray',
    borderWidth: 1,
    width: 200
  },
  textInput: {
    height: 30,
    borderColor: 'gray',
    borderWidth: 1,
    margin: 8
  },
  metaInfoWindow: {
    backgroundColor: 'white',
    padding: 16
  },
  metaMainView: {
    margin: 8,
  },
  commentView: {
    height: 30,
  },
  metaTagName: {
    color: 'gray'
  },
  metaTagContent: {
    color: 'black'
  },
});

export default Home;
