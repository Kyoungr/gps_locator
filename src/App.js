import React, { Component } from 'react';
import GoogleMap from 'google-map-react';
import axios from 'axios';
import Pusher from 'pusher-js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const MY_API_KEY = "YOUR_GOOGLE_API_KEY"


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

  /**
   * pusher:subscription_succeeded event that is triggered from the backend server when a user successfully subscribes to a presence channel .
   * location-update event which is triggered when another user’s location is updated.
   * pusher:member_removed event that is triggered when another user goes offline.
   * pusher:member_added event that is triggered when a new user comes online.
   */
  componentDidMount() {
    let pusher = new Pusher('YOUR_KEY', {
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


  /**
   * first checks if the application can access the geolocation property of the browser and alerts the user if it can’t. 
   * The navigator.geolocation.watchPosition() method gets the users’ location as the user moves and then updates the component states with the most up to date location of the user. 
   * Afterwards, a request is made to the backend server to trigger a location-update event so that other signed in users can be notified with the latest location.
   */
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


  /**
   * Alerts the user of new online users and how many are on the channel.
   */
  notify = () => toast(`Users online : ${Object.keys(this.state.users_online).length}`, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    type: 'info'
  });

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