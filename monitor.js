const cloudscraper = require('cloudscraper');
const path = require('path')
const opn = require('opn')
const fs = require('fs')
const readline = require('readline');
const config = require('./config.json')
const notifier = require('node-notifier');
const hookcord = require('hookcord');


let Base = hookcord.Base;
let restockLive = false

let proxyArray = []

let requestOptions = {
  method: 'GET',
  url: 'https://www.cybersole.io/api/shop/purchase',
}

let currentProxy = 0

function checkCyber() {
  if (proxyArray.length > 0) {
    requestOptions.proxy = proxyArray[currentProxy]
    currentProxy++;
    if (currentProxy > proxyArray.length)
      currentProxy = 0
  }

  console.log('Checking Cyber...')

  cloudscraper.request(requestOptions, function (err, res, body) {

    if (err) {
      console.log(err)
      console.log('Error occurred');
      return
    }

    data = JSON.parse(body)

    console.log('In Stock?: ' + data.available)

    if (data.available && !restockLive) {

      restockLive = true

      console.log('Restocked!!')

      var hook = config.discordWebhook ? new Base("", { 'link': config.discordWebhook }, {
        'embeds': [{
          'title': 'Cybersole Restock',
          'url': 'https://www.cybersole.io/',
          'color': '65280',
          'fields': [{
            'name': 'Question',
            'value': `${data.question}`,
            'inline': true
          },
          {
            'name': 'Link',
            'value': 'https://www.cybersole.io/',
            'inline': false
          }],
          'thumbnail': {
            'url': 'https://pbs.twimg.com/profile_images/982280328143392769/_KELHBk9_400x400.jpg'
          },
          'timestamp': new Date()
        }]
      }) : null;
      config.discordWebhook ? hook.send().then(function (request) {
        console.log('Sent To Discord')
      }) : null;

      notifier.notify({
        title: 'Cybersole Restock',
        message: `Question: ${data.question}`,
        icon: path.join(__dirname, 'cybersole.jpg'),
        reply: true
      })
      notifier.on('replied', function (obj, options, metadata) {
        let tempRequest = requestOptions;
        tempRequest.url = 'https://cybersole.io/api/shop/purchase?answer=' + metadata.activationValue

        cloudscraper.request(tempRequest, function (err, res, body) {
          data = JSON.parse(body)

          if(data.correct) {
            opn(data.url)
          }
        })

      });
      notifier.on('click', function () {
        opn('https://www.cybersole.io/')
      });

    } else if (!data.available && restockLive)
      restockLive = false

    setTimeout(checkCyber, config.monitorDelay)
  });
}

readline.createInterface({
  input: fs.createReadStream(path.join(__dirname, config.proxyFile)),
  terminal: false
}).on('line', function (line) {
  let proxy = line.split(':')
  let proxyString
  if (proxy.length > 2)
    proxyString = `http://${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`
  else
    proxyString = `http://${proxy[0]}:${proxy[1]}`

  proxyArray.push(proxyString)
}).on('close', function () {
  checkCyber()
});