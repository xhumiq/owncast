import { h, Component, createRef } from '/js/web_modules/preact.js';
import htm from '/js/web_modules/htm.js';
const html = htm.bind(h);

export default function ({server, onSubmit}) {
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
        <h2 style="text-align: center">請登入 Please Login</h2>
        <h3>${server}</h3>
        <div class="mb-3"><input ref=${passwd} class="form-control" type="password" name="password" placeholder="密碼 Password"/></div>
        <div class="mb-3"><button class="btn btn-primary d-block w-100" type="submit">登入 Login</button></div>
      </form>
    </section>
  `;
}
