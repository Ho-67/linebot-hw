import 'dotenv/config'
import linebot from 'linebot'
import commandVet, { setPreprocessedData } from './commands/vet.js'
import commandAdopt from './commands/adoptQR.js'
import { promises as fs } from 'fs'
import { readVetStats } from './utils/readVetStats.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

// 初始化函式：載入資料與統計
async function initializeBot() {
  try {
    // 讀取預處理後的動物醫院資料
    console.log('正在載入預處理後的動物醫院資料...')
    const vetDataPath = join(__dirname, 'dump', 'preprocessed_vet_data.json')
    const data = await fs.readFile(vetDataPath, 'utf8')
    const preprocessedVetData = JSON.parse(data)
    setPreprocessedData(preprocessedVetData)
    console.log(`成功載入 ${preprocessedVetData.length} 筆動物醫院資料`)

    // 讀取預處理的統計資料
    const stats = await readVetStats()
    if (stats) {
      console.log('預處理統計資料:', stats)
    } else {
      console.log('無法讀取預處理統計資料或尚未產生')
    }
  } catch (error) {
    console.error('初始化失敗:', error)
    console.error('請確認已運行 "node scripts/preprocessVets.js" 來產生資料')
  }
}

initializeBot()

bot.on('message', (event) => {
  if (event.message.type === 'location') {
    console.log(`使用者傳送位置:`, event.message.latitude, event.message.longitude)
    commandVet(event)
  } else if (event.message.type === 'text') {
    const msg = event.message.text.toLowerCase()
    if (msg === '認領養') {
      commandAdopt(event, true)
    } else {
      event.reply('請輸入「認領養」查詢動物 🐾或傳送位置資訊尋找附近的動物醫院 🏥')
    }
  }
})

bot.on('postback', async (event) => {
  commandAdopt(event)
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
