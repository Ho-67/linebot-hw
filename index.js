import 'dotenv/config'
import linebot from 'linebot'
import commandAnimal from './commands/animal.js'
import commandAdopt from './commands/adoptQR.js'

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

bot.on('message', (event) => {
  if (event.message.type === 'location') {
    commandAnimal(event)
  } else if (event.message.type === 'text') {
    const msg = event.message.text.toLowerCase()
    if (msg === '認領養') {
      commandAdopt(event) // 傳送選單
    } else {
      event.reply('請輸入「認領養」或傳送位置查詢動物 🐾')
    }
  }
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
