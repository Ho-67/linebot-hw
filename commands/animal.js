import axios from 'axios'
import template from '../templates/animal.js'

const ageMap = { ADULT: '已成年', CHILD: '未成年', N: '待確認' }
const genderMap = { F: '母', M: '公', N: '待確認' }
const bodyTypeMap = { SMALL: '小', MEDIUM: '中', BIG: '大', N: '待確認' }
const vaccineMap = { 是: 'T', 否: 'F', 待確認: 'N' }
const sterilizationMap = { 是: 'T', 否: 'F', 待確認: 'N' }

// 洗牌函式
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )
    console.log('取得資料筆數:', data.length)

    let filtered = data

    // 如果是位置訊息，提醒使用選單查詢
    if (event.message?.type === 'location') {
      return await event.reply('目前尚無法使用位置搜尋，請使用「認領養」選單依地區選擇')
    }

    if (Array.isArray(type)) {
      console.log('篩選條件 (type array):', type)
      const [animalType, regionBig, city, age, bodytype, sex, vaccine, sterilization] = type

      console.log(
        '範例地址 list:',
        data.slice(0, 5).map((i) => i.shelter_address),
      )

      filtered = data.filter((item) => {
        let kindMatch = true
        if (animalType === '狗') kindMatch = item.animal_kind === '狗'
        else if (animalType === '貓') kindMatch = item.animal_kind === '貓'
        const cityMatch = city ? item.shelter_address?.includes(city) : true

        const ageMatch = age ? ageMap[item.animal_age] === age : true

        const bodyMatch = bodytype ? bodyTypeMap[item.animal_bodytype] === bodytype : true

        const sexMatch = sex ? genderMap[item.animal_sex] === sex : true

        const vaccineMatch =
          vaccine === '否'
            ? item.animal_bacterin === 'F' || item.animal_bacterin === 'N'
            : vaccine === '是'
              ? item.animal_bacterin === 'T'
              : true

        const sterilizationMatch =
          sterilization === '否'
            ? item.animal_sterilization === 'F' || item.animal_sterilization === 'N'
            : sterilization === '是'
              ? item.animal_sterilization === 'T'
              : true

        console.log(
          `item ${item.animal_id}:`,
          '品種:',
          kindMatch,
          '縣市:',
          cityMatch,
          '年齡:',
          ageMatch,
          '體型:',
          bodyMatch,
          '性別:',
          sexMatch,
          '疫苗:',
          vaccineMatch,
          '絕育:',
          sterilizationMatch,
        )

        return (
          kindMatch &&
          cityMatch &&
          ageMatch &&
          bodyMatch &&
          sexMatch &&
          vaccineMatch &&
          sterilizationMatch
        )
      })

      console.log('篩選後筆數:', filtered.length)

      // 隨機抽五筆
      filtered = shuffleArray(filtered).slice(0, 5)
      console.log('隨機抽取後筆數:', filtered.length)
    }

    // 判斷 filtered 是否有資料
    if (filtered.length === 0) {
      console.log('沒有符合的動物，原始條件如下：', { type })
      return await event.reply('抱歉，目前沒有找到符合條件的動物')
    }

    const bubbles = filtered
      .map((value) => {
        try {
          return template(value)
        } catch (e) {
          console.error('Flex Bubble 產生錯誤：', e, value)
          return null
        }
      })
      .filter(Boolean)

    if (bubbles.length === 0) {
      return await event.reply('目前有符合條件的資料，但 Flex 格式產生失敗！')
    }

    await event.reply({
      type: 'flex',
      altText: '認領養動物列表',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error('commandAnimal 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
