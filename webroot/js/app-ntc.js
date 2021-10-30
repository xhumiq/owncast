import { h, Component } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

import VideoPoster from './components/video-poster.js';
import { OwncastPlayer } from './components/player.js';
import LoginForm from './components/login-form.js';
import { login } from './components/keycloak.js';

import {
  addNewlines,
  makeLastOnlineString,
  pluralize,
} from './utils/helpers.js';
import {
  URL_CONFIG,
  URL_STATUS,
  URL_VIEWER_PING,
  TIMER_STATUS_UPDATE,
  TIMER_STREAM_DURATION_COUNTER,
  TEMP_IMAGE,
  MESSAGE_OFFLINE,
  MESSAGE_ONLINE,
} from './utils/constants.js';

export default class VideoOnly extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      configData: {},

      playerActive: false, // player object is active
      streamOnline: false, // stream is active/online
      authToken: false,

      isPlaying: false,

      //status
      streamStatusMessage: MESSAGE_OFFLINE,
      loginErrorMsg: "",
      viewerCount: '',
      lastDisconnectTime: null,
    };
    this.updateDuration = TIMER_STATUS_UPDATE;
    // timers
    this.playerRestartTimer = null;
    this.offlineTimer = null;
    this.statusTimer = null;
    this.streamDurationTimer = null;

    this.handleOfflineMode = this.handleOfflineMode.bind(this);
    this.handleOnlineMode = this.handleOnlineMode.bind(this);

    // player events
    this.handlePlayerReady = this.handlePlayerReady.bind(this);
    this.handlePlayerPlaying = this.handlePlayerPlaying.bind(this);
    this.handlePlayerEnded = this.handlePlayerEnded.bind(this);
    this.handlePlayerError = this.handlePlayerError.bind(this);
    this.handleLogin = this.handleLogin.bind(this);

    // fetch events
    this.getConfig = this.getConfig.bind(this);
    this.getStreamStatus = this.getStreamStatus.bind(this);
  }

  componentDidMount() {
    this.getConfig();

    this.player = new OwncastPlayer();
    this.player.setupPlayerCallbacks({
      onReady: this.handlePlayerReady,
      onPlaying: this.handlePlayerPlaying,
      onEnded: this.handlePlayerEnded,
      onError: this.handlePlayerError,
    });
    this.player.init();
  }

  componentWillUnmount() {
    // clear all the timers
    clearInterval(this.playerRestartTimer);
    clearInterval(this.offlineTimer);
    clearInterval(this.statusTimer);
    clearInterval(this.streamDurationTimer);
  }

  // fetch /config data
  getConfig() {
    fetch(URL_CONFIG)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok ${response.ok}`);
        }
        return response.json();
      })
      .then((json) => {
        this.setConfigData(json);
      })
      .catch((error) => {
        this.handleNetworkingError(`Fetch config: ${error}`);
      });
  }

  // fetch stream status
  getStreamStatus() {
    fetch(URL_STATUS)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok ${response.ok}`);
        }
        return response.json();
      })
      .then((json) => {
        this.updateStreamStatus(json);
      })
      .catch((error) => {
        this.handleOfflineMode();
        this.handleNetworkingError(`Stream status: ${error}`);
      });

    // Ping the API to let them know we're an active viewer
    fetch(URL_VIEWER_PING).catch((error) => {
      this.handleOfflineMode();
      this.handleNetworkingError(`Viewer PING error: ${error}`);
    });
  }

  setConfigData(data = {}) {
    const { streamTitle, summary } = data;
    window.document.title = streamTitle + " Broadcast";
    this.setState({
      configData: {
        ...data,
        streamTitle,
        summary: summary && addNewlines(summary),
      },
    });
  }

  // handle UI things from stream status result
  updateStreamStatus(status = {}) {
    const { streamOnline: curStreamOnline } = this.state;

    if (!status) {
      return;
    }
    const { viewerCount, online, lastDisconnectTime } = status;

    if (status.online && !curStreamOnline) {
      // stream has just come online.
      this.handleOnlineMode();
    } else if (!status.online && curStreamOnline) {
      // stream has just flipped offline.
      this.handleOfflineMode();
    }
    this.setState({
      viewerCount,
      streamOnline: online,
      lastDisconnectTime,
    });
  }

  // when videojs player is ready, start polling for stream
  handlePlayerReady() {
    this.getStreamStatus();
    this.statusTimer = setInterval(this.getStreamStatus, this.updateDuration);
  }

  handlePlayerPlaying() {
    this.setState({
      isPlaying: true,
    });
  }

  // likely called some time after stream status has gone offline.
  // basically hide video and show underlying "poster"
  handlePlayerEnded() {
    this.setState({
      playerActive: false,
      isPlaying: false,
    });
  }

  handlePlayerError() {
    // do something?
    this.handleOfflineMode();
    this.handlePlayerEnded();
  }

  // stop status timer and disable chat after some time.
  handleOfflineMode() {
    this.updateDuration = TIMER_STATUS_UPDATE;
    clearInterval(this.streamDurationTimer);
    this.setState({
      streamOnline: false,
      streamStatusMessage: MESSAGE_OFFLINE,
    });
  }

  // play video!
  handleOnlineMode() {
    this.updateDuration = 5000;
    this.player.startPlayer();
    this.streamDurationTimer = setInterval(
      this.setCurrentStreamDuration,
      TIMER_STREAM_DURATION_COUNTER
    );
    console.log("Set State OnLine", true)
    this.setState({
      playerActive: true,
      streamOnline: true,
      streamStatusMessage: MESSAGE_ONLINE,
    });
  }

  handleNetworkingError(error) {
    console.log(`>>> App Error: ${error}`);
  }

  handleLogin(userInfo){
    const req = login(userInfo).then(data=>{
      this.setState({
        authToken: data.access_token,
        streamStatusMessage: "Logged into to stream successfully",
      })
    },err=>{
      this.setState({
        authToken:"",
        loginErrorMsg: "密碼錯誤 Invalid Password",
        streamStatusMessage: "Unable to login to stream",
      })
    });
  }

// 系統錯誤 - 請稍後再試。
  render(props, state) {
    const {
      configData,
      authToken,
      viewerCount,
      playerActive,
      streamOnline,
      streamStatusMessage,
      lastDisconnectTime,
      isPlaying,
      loginErrorMsg,
    } = state;
    const { logo = TEMP_IMAGE, customStyles } = configData;

    let viewerCountMessage = '';
    if (streamOnline && viewerCount > 0) {
      viewerCountMessage = html`${viewerCount}
      ${pluralize(' viewer', viewerCount)}`;
    } else if (lastDisconnectTime) {
      viewerCountMessage = makeLastOnlineString(lastDisconnectTime);
    }
    const mainClass = playerActive ? 'online' : '';
    const showPlayer = authToken ? 'visible' : 'hidden';
    const showLogin = !!authToken;
    const poster = isPlaying
      ? null
      : html` <${VideoPoster} offlineImage=${logo} active=${streamOnline} /> `;
    const loginForm = authToken ? null : html`
      <${LoginForm} server="${configData.streamTitle}" onSubmit=${this.handleLogin} errorMsg=${loginErrorMsg}/>
    `;
    console.log("Status", streamOnline, playerActive)
    return html`
      <main id="app-ntc" class=${mainClass}>
        <style>
          ${customStyles}
        </style>
        ${loginForm}
        <div
          id="video-container"
          class="flex owncast-video-container w-full bg-center bg-no-repeat flex flex-col items-center justify-start"
        >
          <video
            class="video-js vjs-big-play-centered display-block w-full h-full"
            id="video"
            preload="auto"
            controls
            playsinline
          ></video>
          ${poster}
        </div>
        <section
          id="stream-info"
          aria-label="Stream status"
          class="flex flex-row justify-between font-mono py-2 px-4 bg-gray-900 text-indigo-200 shadow-md border-b border-gray-100 border-solid"
        >
          <span class="text-xs">${streamStatusMessage}</span>
          <span id="stream-viewer-count" class="text-xs text-right"
          >${viewerCountMessage}</span
          >
        </section>
      </main>
    `;
  }
}
