import 'dotenv/config'
import linebot from 'linebot'
import commandAnimal from './commands/animal.js'
import commandQr from './commands/qr.js'

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

bot.on('message', (event) => {
  // 立即回應 200 OK
  event.reply('收到訊息').then(() => {
    if (event.message.type === 'location') {
      commandAnimal(event)
    } else if (event.message.type === 'text') {
      const msg = event.message.text.toLowerCase()
      if (msg === '認領養') {
        commandQr(event) // 傳送選單
      } else {
        event.reply('請輸入「認領養」或傳送位置查詢動物 🐾')
      }
    }
  })
})

bot.on('postback', async (event) => {
  const type = event.postback.data // '狗'、'貓'、'其他'
  await commandAnimal(event, type) // 把 type 傳進去查資料
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
