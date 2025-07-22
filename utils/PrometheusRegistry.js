const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });
register.setDefaultLabels({ app: "arc_connect_backend" });

module.exports = {
  register,
  client
};
