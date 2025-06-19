import commandAnimal from './animal.js'

// 主功能：處理認領養選單流程
export default async function adopt(event, isFirstTime = false) {
  const data = event.postback?.data

  console.log('[adoptQR] 收到 postback data:', data)

  // 初次進入：輸入「認領養」時，顯示第一層
  if (isFirstTime || !data) {
    await event.reply({
      type: 'text',
      text: '請選擇認領養的動物種類：',
      quickReply: {
        items: ['狗', '貓', '其他'].map((label) => ({
          type: 'action',
          action: {
            type: 'postback',
            label,
            data: label,
            displayText: label,
          },
        })),
      },
    })
    return
  }

  // 非第一次進入時，依照層級進行處理
  const parts = data.split('|')
  console.log('[adoptQR] 解析後 parts:', parts)

  if (parts.length === 1) {
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
    const [animalType, regionBig, city, age] = parts
    await event.reply({
      type: 'text',
      text: '請選擇動物體型：',
      quickReply: {
        items: ['大', '中', '小'].map((bodytype) => ({
          type: 'action',
          action: {
            type: 'postback',
            label: bodytype,
            data: `${animalType}|${regionBig}|${city}|${age}|${bodytype}`,
            displayText: bodytype,
          },
        })),
      },
    })
  } else if (parts.length === 5) {
    const [animalType, regionBig, city, age, bodytype] = parts
    await event.reply({
      type: 'text',
      text: '請選擇動物性別：',
      quickReply: {
        items: ['公', '母'].map((sex) => ({
          type: 'action',
          action: {
            type: 'postback',
            label: sex,
            data: `${animalType}|${regionBig}|${city}|${age}|${bodytype}|${sex}`,
            displayText: sex,
          },
        })),
      },
    })
  } else if (parts.length === 6) {
    console.log('[adoptQR] 條件齊全，呼叫 commandAnimal')
    await commandAnimal(event, parts) // 正確帶入 6 個條件參數
  } else {
    await event.reply('無效的選擇，請重新開始。')
  }
}
