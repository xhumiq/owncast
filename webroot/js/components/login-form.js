import { h, Component } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

export default function (props) {
  const {showLogin} = props;

  return html`
  <section
    id="login-form-section"
    aria-label="Login Form"
    style="visibility:${showLogin};"
  >
    <form id="login-form">
      <h2 class="visually-hidden">Login Form</h2>
      <div class="illustration"><i class="icon ion-ios-locked-outline"></i></div>
      <div class="mb-3"><input class="form-control" type="text" name="Username" placeholder="Username"></div>
      <div class="mb-3"><input class="form-control" type="password" name="password" placeholder="Password"></div>
      <div class="mb-3"><button class="btn btn-primary d-block w-100" type="submit">GET STARTED</button></div>
    </form>
  </section>
  `;
}
