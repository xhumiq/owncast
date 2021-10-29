import qs from '/js/web_modules/qs/dist/qs.js';
import axios from '/js/web_modules/axios/dist/axios.min.js'

var apiConfig={
  clientId: "owncast",
  grantType: "password",
  scope: "openid",
  defaultUser: "kefych",
  url: "https://auth-jp1.kefacp.com/auth/realms/chat-acp/protocol/openid-connect/token"
}

export function init(cfg){
  const config={...apiConfig, ...cfg};
  if (!cfg.url && cfg.server){
    cfg.realm = cfg.realm || "chat-acp";
    config.url = `https://${cfg.server}.kefacp.com/auth/realms/${cfg.realm}/protocol/openid-connect/token`
  }
  apiConfig = config;
}

export function login(userData){
  const req = {
    client_id: apiConfig.clientId,
    grant_type: apiConfig.grantType,
    scope: apiConfig.scope,
    username: apiConfig.defaultUser,
    ...userData,
  }
  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify(req),
    url: apiConfig.url,
  };
  return new Promise((resolve, reject) => {
    axios(options).then(data=>{
      resolve(data.data || data)
    },err=>{
      err = err || {};
      err = err.response || err;
      if(err.data)err = {...err.data, status: err.status}
      reject(err);
    });
  });
}
