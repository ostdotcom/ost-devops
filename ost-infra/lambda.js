
const rootPrefix = '.'
  , CreateErrorEntry = require(rootPrefix + '/lib/error_logs/create_entry')
;

const Main = async function (event) {

  let performerObj = null
  ;

  return new Promise(async function (resolve, reject) {

    try {
      if(event.action === 'create_alert') {

        for(let i=0;i<event.items.length;i++){
          let item = event.items[i];
          performerObj = new CreateErrorEntry(item);
          let resp = await performerObj.perform();
          if(resp.isSuccess()){
            return resolve(resp);
          } else {
            return reject(resp);
          }

        }
      } else {
        return reject(errorHandler('Invalid event action.'));
      }

    } catch (e) {
      return reject(e);
    }

  });
};

const errorHandler = function (msg) {
  return new Error(msg)
};

exports.handler = async function(event) {

  console.log("******** event: ", event);

  return Main(event);

};

// Test it locally by uncommenting below lines
/*
Main({
  "action": "create_alert",
  "items": [
    {
      "appName": "appName-test",
      "envIdentifier": "envIdentifier-test",
      "severity": "high",
      "ipAddress": "ipAddress-test",
      "kind": "kind-test",
      "data": {
        "test-key": "val-test"
      }
    }
  ]
}).then(function(res){console.log(res);process.exit(0);}).catch(function (err) { console.log(err); process.exit(1);});
*/