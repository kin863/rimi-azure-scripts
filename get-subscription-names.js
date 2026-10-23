// Required params - clientId, clientSecretPlain, tenantId
// ================================ Step 1: Get token ======================================
var req = new HttpRequest();

var body =
    "grant_type=client_credentials" +
    "&client_id=" + encodeURIComponent(clientId) +
    "&client_secret=" + encodeURIComponent(clientSecretPlain) +
    "&scope=" + encodeURIComponent("https://management.azure.com/.default");

req.addHeader("Content-Type: application/x-www-form-urlencoded");

var response = req.post(
    "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token",
    body
);

var tokenData = JSON.parse(response);

if (!tokenData.access_token) {
    throw "Failed to acquire token. Check credentials.";
}

var token = {
    accessToken: tokenData.access_token
};

req = new HttpRequest();
req.addHeader("Authorization: Bearer " + token.accessToken);
req.addHeader("Content-Type: application/json");

var subsUrl = "https://management.azure.com/subscriptions?api-version=2020-01-01";

var subscriptionsResponse = req.get(subsUrl);
var subscriptionsData = JSON.parse(subscriptionsResponse);
var subscriptions = subscriptionsData.value || [];

var result = [];

for (var i = 0; i < subscriptions.length; i++) {
    result.push({
        "{#SUBSCRIPTION_ID}": subscriptions[i].subscriptionId,
        "{#SUBSCRIPTION_NAME}": subscriptions[i].displayName
    });
}

return JSON.stringify(result);