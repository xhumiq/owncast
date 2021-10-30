import { h, Component, createRef } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

export default class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.passwd = createRef();
  }

  handleSubmit = evt => {
    evt.preventDefault();
    if (this.passwd.current) {
      this.props.onSubmit({password: this.passwd.current.value})
    }
  }

  componentDidMount() {
    if (this.passwd.current) {
      this.passwd.current.focus();
    }
  }

  render() {
    const {errorMsg} = this.props;
    const hasError = !!errorMsg ? "error-visible" : "";
    return html`
      <section id="login-form-section" class="login-dark">
        <form id="login-form" onsubmit=${this.handleSubmit}>
          <h3>${this.props.server}</h3>
          <div class="mb-3">
            <input ref=${this.passwd} class="form-control" type="text" name="password" placeholder="密碼 Password"/>
          </div>
          <div class="mb-3 error-msg ${hasError}">
            <span>${errorMsg}</span>
          </div>
          <div class="mb-3">
            <button class="btn btn-primary d-block w-100" type="submit">
              進城 Enter
            </button>
          </div>
        </form>
      </section>
    `;
  }
}
