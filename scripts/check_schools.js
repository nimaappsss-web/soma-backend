const { Client } = require("pg");
const client = new Client("postgresql://postgres:pLeRFSuWGXszcFDQCxmZUMTrxVmQCuwU@interchange.proxy.rlwy.net:50213/railway");
client.connect().then(() => {
  return client.query('SELECT id, name, "schoolType" FROM "School"');
}).then((res) => {
  console.log(JSON.stringify(res.rows, null, 2));
  return client.end();
}).catch(console.error);
