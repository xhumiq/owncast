import { h, Component } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

export default class LoginForm extends Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
  }
  componentDidUpdate(prevProps) {
  }
  componentWillUnmount() {
  }

  render() {
    return html`
      <form id="login-form">
        <input name="password" type="password"/>
        <button name="login" type="submit">Login</button>
      </form>
    `;
  }
}
