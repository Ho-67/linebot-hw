import 'dotenv/config'
import linebot from 'linebot'
import commandVet from './commands/vet.js'
import commandAdopt from './commands/adoptQR.js'

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

bot.on('message', (event) => {
  if (event.message.type === 'location') {
    commandVet(event)
  } else if (event.message.type === 'text') {
    const msg = event.message.text.toLowerCase()
    if (msg === '認領養') {
      commandAdopt(event, true) // true 表示這是從文字輸入開始的
    } else {
      event.reply('請輸入「認領養」查詢動物 🐾或傳送位置資訊尋找最近的動物醫院 🏥')
    }
  }
})

bot.on('postback', async (event) => {
  // 根據 postback 資料處理認養流程
  commandAdopt(event) // 傳送選單
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})

export default bot
