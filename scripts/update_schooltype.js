const { Client } = require("pg");
const client = new Client("postgresql://postgres:pLeRFSuWGXszcFDQCxmZUMTrxVmQCuwU@interchange.proxy.rlwy.net:50213/railway");
client.connect().then(() => {
  return client.query('UPDATE "School" SET "schoolType" = \'["creche","kg","primary","secondary"]\' WHERE id = \'cmr9crou600021y988x0moha5\'');
}).then((res) => {
  console.log("Updated:", res.rowCount, "row(s)");
  return client.query('SELECT id, name, "schoolType" FROM "School"');
}).then((res) => {
  console.log(JSON.stringify(res.rows, null, 2));
  return client.end();
}).catch(console.error);
