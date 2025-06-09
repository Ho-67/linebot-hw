import animal from '../commands/animal.js'

export default async function adopt(event) {
  const data = event.postback.data
  const parts = data.split('|')

  if (event.message.text === '認領養') {
    // 第一層：選擇動物種類
    await event.reply({
      type: 'text',
      text: '請選擇認領養的動物種類：',
      quickReply: {
        items: ['狗', '貓', '其他'].map((label) => ({
          type: 'action',
          action: {
            type: 'postback',
            label, // 按鈕文字
            data: label, // 傳去postback事件的資料
            displayText: label, // 使用者傳送的文字
          },
        })),
      },
    })
  } else if (parts.length === 1) {
    // 第二層：選地區
    const [animalType] = parts
    await event.reply({
      type: 'text',
      text: '請選擇所在地區：',
      quickReply: {
        items: ['北區', '中區', '南區', '東區', '外島'].map((label) => ({
          type: 'action',
          action: {
            type: 'postback',
            label,
            data: `${animalType}|${label}`,
            displayText: label,
          },
        })),
      },
    })
  } else if (parts.length === 2) {
    // 第三層：選縣市
    const [animalType, regionBig] = parts

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
      text: '請選擇縣市：',
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
    // 第四層：選年齡
    const [animalType, regionBig, city] = parts

    await event.reply({
      type: 'text',
      text: '請選擇動物年齡：',
      quickReply: {
        items: ['未成年', '已成年'].map((age) => ({
          type: 'action',
          action: {
            type: 'postback',
            label: age,
            data: `${animalType}|${regionBig}|${city}|${age}`,
            displayText: age,
          },
        })),
      },
    })
  } else if (parts.length === 4) {
    return animal(event, parts)
  } else {
    await event.reply('無效的選擇，請重新開始。')
  }
}
