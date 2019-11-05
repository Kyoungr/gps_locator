import React, { Component } from 'react';
import GoogleMap from 'google-map-react';
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-places-autocomplete';
import axios from 'axios';
import Pusher from 'pusher-js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const MY_API_KEY = "AIzaSyBX69NXhGj4ymeMl2otJRvycvHb_85hPYw"


const mapStyles = {
  width: '100%',
  height: '100%',
}

const markerStyle = {
  height: '50px',
  width: '50px',
  marginTop: "-50px"
}

const imgStyle = {
  height: '100%'
}

const Marker = ({ title }) => (
  <div style={markerStyle}>
    <img style={imgStyle} alt={title} src="https://res.cloudinary.com/og-tech/image/upload/s--OpSJXuvZ--/v1545236805/map-marker_hfipes.png" />
    <h3>{title}</h3>
  </div>
);

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      center: { lat: 5.6219868, lng: -0.23223 },
      locations: {},
      users_online: {},
      current_user: '',
      address: '' 
    };
  }

  componentDidMount() {
    let pusher = new Pusher('c60e22e1a600d55c004e', {
      authEndpoint: "http://localhost:3128/pusher/auth",
      cluster: "us2"
    });

    this.presenceChannel = pusher.subscribe('presence-channel');
    this.presenceChannel.bind('pusher:subscription_succeeded', members => {
      this.setState({
        users_online: members.members,
        current_user: members.myID
      });
      this.getLocation();
      this.notify();
    });

    this.presenceChannel.bind('location-update', body => {
      this.setState((prevState, props) => {
        const newState = { ...prevState };
        newState.locations[`${body.username}`] = body.location;
        return newState;
      });
    });

    this.presenceChannel.bind('pusher:member_removed', member => {
      this.setState((prevState, props) => {
        const newState = { ...prevState };
        // remove member location once they go offline
        delete newState.locations[`${member.id}`];
        // delete member from the list of online users
        delete newState.users_online[`${member.id}`];

        return newState;
      })
      this.notify();
    })

    this.presenceChannel.bind('pusher:member_added', member => {
      this.notify();
    })
  }

  getLocation = () => {
    if ("geolocation" in navigator) {
      // get the longitude & latitude then update the map center as the new user location
      navigator.geolocation.watchPosition(position => {
        let location = { lat: position.coords.latitude, lng: position.coords.longitude };

        this.setState((prevState, props) => {
          let newState = { ...prevState };

          newState.center = location;
          newState.locations[`${prevState.current_user}`] = location;

          return newState;
        });

        axios.post("http://localhost:3128/update-location", {
          username: this.state.current_user,
          location: location
        }).then(res => {
          if (res.status === 200) {
            console.log("new location updated successfully");
          }
        });
      })
    } else {
      alert("Sorry, geolocation is not available on your device. You need that to use this app");
    }
  }

  notify = () => toast(`Users online : ${Object.keys(this.state.users_online).length}`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    type: 'info'
  });

  handleChange = address => {
    this.setState({ address });
  };

  handleSelect = address => {
    geocodeByAddress(address)
      .then(results => getLatLng(results[0]))
      .then(latLng => console.log('Success', latLng))
      .catch(error => console.error('Error', error));
  };

  render() {
    var locationMarkers = Object.keys(this.state.locations).map((username, id) => {
      return (
        <Marker
          key={id}
          title={`${username === this.state.current_user ? 'My location' : username + "'s location"}`}
          lat={this.state.locations[`${username}`].lat}
          lng={this.state.locations[`${username}`].lng}
        >
        </Marker>
      );
    });

    return (
      <div>
         <PlacesAutocomplete
        value={this.state.address}
        onChange={this.handleChange}
        onSelect={this.handleSelect}
      >
        {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
          <div>
            <input
              {...getInputProps({
                placeholder: 'Search Places ...',
                className: 'location-search-input',
              })}
            />
            <div className="autocomplete-dropdown-container">
              {loading && <div>Loading...</div>}
              {suggestions.map(suggestion => {
                const className = suggestion.active
                  ? 'suggestion-item--active'
                  : 'suggestion-item';
                // inline style for demonstration purpose
                const style = suggestion.active
                  ? { backgroundColor: '#fafafa', cursor: 'pointer' }
                  : { backgroundColor: '#ffffff', cursor: 'pointer' };
                return (
                  <div
                    {...getSuggestionItemProps(suggestion, {
                      className,
                      style,
                    })}
                  >
                    <span>{suggestion.description}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PlacesAutocomplete>
        <GoogleMap
          style={mapStyles}
          bootstrapURLKeys={{ key:MY_API_KEY }}
          center={this.state.center}
          zoom={10}
        >
          {locationMarkers}
        </GoogleMap>
        <ToastContainer />
      </div>
    )
  }
}

export default App;