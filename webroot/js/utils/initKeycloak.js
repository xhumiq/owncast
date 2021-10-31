function initKeycloak()
{
    alert("249");
    var keycloak = new Keycloak("js/keycloak.json");
            keycloak.init( {onload:'login-required'}).then(function(authenticated) {
                alert(authenticated ? 'authenticated' : 'not authenticated');
            }).catch(function() {
                alert('failed to initialize');
            });
}