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

bot.on('postback', async (event) => {
  const data = event.postback.data
  const parts = data.split('|')

  if (parts.length === 1) {
    // 第一層：動物種類（狗、貓、其他）
    const animalType = parts[0]
    // 送出第二層：請選擇大區域
    await event.reply({
      type: 'text',
      text: `你選了${animalType}，請選擇區域：`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '北區',
              data: `${animalType}|北區`,
              displayText: '北區',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '中區',
              data: `${animalType}|中區`,
              displayText: '中區',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '南區',
              data: `${animalType}|南區`,
              displayText: '南區',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '東區',
              data: `${animalType}|東區`,
              displayText: '東區',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '外島',
              data: `${animalType}|外島`,
              displayText: '外島',
            },
          },
        ],
      },
    })
  } else if (parts.length === 2) {
    // 第二層：動物種類 + 大區域，接著細分縣市
    const [animalType, regionBig] = parts

    // 根據大區域給不同縣市選項
    let cityOptions = []

    switch (regionBig) {
      case '北區':
        cityOptions = ['臺北', '新北', '基隆', '桃園', '新竹', '宜蘭']
        break
      case '中區':
        cityOptions = ['臺中', '苗栗', '彰化', '南投', '雲林']
        break
      case '南區':
        cityOptions = ['高雄', '臺南', '嘉義', '屏東']
        break
      case '東區':
        cityOptions = ['花蓮', '臺東']
        break
      case '外島':
        cityOptions = ['澎湖', '金門', '連江']
        break
      default:
        cityOptions = ['其他']
    }

    await event.reply({
      type: 'text',
      text: `你選了${animalType}，地區：${regionBig}，請選擇縣市`,
      quickReply: {
        items: cityOptions.map((city) => ({
          type: 'action',
          action: {
            type: 'postback',
            label: city,
            data: `${animalType}|${regionBig}|${city}`,
            displayText: city,
          },
        })),
      },
    })
  } else if (parts.length === 3) {
    // 第三層：動物種類 + 大區域 + 縣市
    const [animalType, regionBig, city] = parts

    // 下一步請選年齡
    await event.reply({
      type: 'text',
      text: `你選了${animalType}，地區：${regionBig} ${city}，請選擇年齡`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '幼犬',
              data: `${animalType}|${regionBig}|${city}|幼犬`,
              displayText: '幼犬',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '成犬',
              data: `${animalType}|${regionBig}|${city}|成犬`,
              displayText: '成犬',
            },
          },
        ],
      },
    })
  } else if (parts.length === 4) {
    // 第四層：動物種類 + 大區域 + 縣市 + 年齡
    const [animalType, regionBig, city, age] = parts

    // 請選擇是否根據天氣推薦
    await event.reply({
      type: 'text',
      text: `你選了${animalType}，地區：${regionBig} ${city}，年齡：${age}，是否需要根據天氣推薦？`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '是',
              data: `${animalType}|${regionBig}|${city}|${age}|是`,
              displayText: '是',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '否',
              data: `${animalType}|${regionBig}|${city}|${age}|否`,
              displayText: '否',
            },
          },
        ],
      },
    })
  } else if (parts.length === 5) {
    // 第五層：所有條件齊全，開始處理查詢
    const [animalType, regionBig, city, age, weather] = parts

    // 這裡你可以根據條件去呼叫 API 篩選動物，或回覆示範文字
    let replyText = `你選擇了：\n動物種類：${animalType}\n地區：${regionBig} ${city}\n年齡：${age}\n天氣推薦：${weather}\n`

    // 如果 weather === '是'，這裡可以加入串天氣API，判斷是否適合出門
    if (weather === '是') {
      // TODO: 使用 city 查詢中央氣象局 API，看今天是否適合外出
    }

    // 簡單示範回覆
    await event.reply(replyText)
  }
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動')
})
