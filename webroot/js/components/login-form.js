import { h, Component, createRef } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

export default function ({onSubmit}) {
  const passwd = createRef();
  const handleSubmit = evt => {
    evt.preventDefault();
    if (passwd.current){
      onSubmit({password:passwd.current.value})
    }
  }
  return html`
    <section id="login-form-section" class="login-dark">
      <form id="login-form" onsubmit=${handleSubmit}>
        <h2>Please Login</h2>
        <div class="illustration"><i class="icon ion-ios-locked-outline"></i></div>
        <div class="mb-3"><input ref=${passwd} class="form-control" type="password" name="password" placeholder="Password"/></div>
        <div class="mb-3"><button class="btn btn-primary d-block w-100" type="submit">GET STARTED</button></div>
      </form>
    </section>
  `;
}
