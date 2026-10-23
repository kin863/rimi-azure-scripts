// Required parameters - clientId, clientSecretPlain, tenantId, subscriptionID, subscriptionName

// ================================ Helper Functions ======================================

function formatDate(date) {
    return date.getFullYear() + '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
        ('0' + date.getDate()).slice(-2);
}

function getAccessToken(tenantId, clientId, clientSecretPlain) {
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

    return tokenData.access_token;
}

function getDateRange() {
    var today = new Date();
    var startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    var endDate = new Date(today);

    return {
        startDateStr: formatDate(startDate),
        endDateStr: formatDate(endDate)
    };
}

function getSubscriptionCost(accessToken, subscriptionID, subscriptionName, startDateStr, endDateStr) {
    var req = new HttpRequest();
    req.addHeader("Authorization: Bearer " + accessToken);
    req.addHeader("Content-Type: application/json");

    var costUrl = "https://management.azure.com/subscriptions/" + 
        subscriptionID + 
        "/providers/Microsoft.CostManagement/query?api-version=2024-08-01";

    var costQueryBody = {
        type: "ActualCost",
        timeframe: "Custom",
        timePeriod: {
            from: startDateStr,
            to: endDateStr
        },
        dataset: {
            granularity: "Monthly",
            aggregation: {
                totalCost: {
                    name: "Cost",
                    function: "Sum"
                }
            },
            grouping: [
                { type: "Dimension", name: "ServiceName" },
                { type: "Dimension", name: "PricingModel" },
                { type: "Dimension", name: "ChargeType" },
                { type: "Dimension", name: "SubscriptionName" }
            ]
        }
    };

    var results = [];

    try {
        var costResponse = req.post(
            costUrl,
            JSON.stringify(costQueryBody)
        );

        var costData = JSON.parse(costResponse);

        if (
            costData.properties &&
            costData.properties.rows &&
            costData.properties.rows.length > 0
        ) {
            for (var r = 0; r < costData.properties.rows.length; r++) {
                var row = costData.properties.rows[r];

                var rType = (!row[2] || String(row[2]).trim() === "")
                    ? "Unassigned"
                    : row[2];

                var uDate = (!row[1] || String(row[1]).trim() === "")
                    ? "2000-01-01"
                    : String(row[1]).substring(0, 10);

                results.push({
                    Sub: subscriptionName,
                    UsageDate: uDate,
                    ResourceType: rType,
                    Cost: Math.round(parseFloat(row[0]) * 100) / 100,
                    Currency: row[6],
                    Pricing: row[3],
                    Charge: row[4]
                });
            }
        }
    }
    catch (e) {
        throw "Error getting cost for subscription: " + e;
    }

    return results;
}

// ================================ Main Execution ======================================

function main() {
    var accessToken = getAccessToken(tenantId, clientId, clientSecretPlain);

    var dates = getDateRange();

    var results = getSubscriptionCost(
        accessToken, 
        subscriptionID, 
        subscriptionName, 
        dates.startDateStr, 
        dates.endDateStr
    );

    return JSON.stringify(results);
}

return main();