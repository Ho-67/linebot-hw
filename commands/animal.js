import axios from 'axios'
import template from '../templates/animal.js'

const ageMap = { ADULT: '已成年', CHILD: '未成年', N: '待確認' }
const genderMap = { F: '母', M: '公', N: '待確認' }
const bodyTypeMap = { SMALL: '小', MEDIUM: '中', BIG: '大', N: '待確認' }

// 洗牌函式
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// 保護 map lookup 的函式
const safeValue = (map, key) => {
  if (!key || typeof key !== 'string') return '待確認'
  return map[key.trim()] || '待確認'
}

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )
    console.log('取得資料筆數:', data.length)

    let filtered = data

    if (event.message?.type === 'location') {
      return await event.reply('目前尚無法使用位置搜尋，請使用「認領養」選單依地區選擇')
    }

    if (Array.isArray(type)) {
      console.log('篩選條件 (type array):', type)
      const [animalType, regionBig, city, age, bodytype, sex] = type

      console.log(
        '範例地址 list:',
        data.slice(0, 5).map((i) => i.shelter_address),
      )

      filtered = data.filter((item) => {
        const kindMatch =
          animalType === '狗'
            ? item.animal_kind === '狗'
            : animalType === '貓'
              ? item.animal_kind === '貓'
              : item.animal_kind !== '狗' && item.animal_kind !== '貓'

        const cityMatch = city
          ? item.shelter_address?.includes(city)
          : item.shelter_address?.includes(regionBig)

        const ageMatch = age ? safeValue(ageMap, item.animal_age) === age : true

        const bodyMatch = bodytype
          ? safeValue(bodyTypeMap, item.animal_bodytype) === bodytype
          : true

        const sexMatch = sex ? safeValue(genderMap, item.animal_sex) === sex : true

        return kindMatch && cityMatch && ageMatch && bodyMatch && sexMatch
      })

      console.log('篩選後筆數:', filtered.length)

      filtered = shuffleArray(filtered).slice(0, 5)
      console.log('隨機抽取後筆數:', filtered.length)
    }

    if (filtered.length === 0) {
      console.log('沒有符合的動物，原始條件如下：', { type })
      return await event.reply('抱歉，目前沒有找到符合條件的動物')
    }

    // 單筆測試輸出一張卡片
    console.log('單筆 Flex 訊息內容:', JSON.stringify(template(filtered[0]), null, 2))

    await event.reply({
      type: 'flex',
      altText: '單筆測試',
      contents: template(filtered[0]),
    })
  } catch (error) {
    console.error('commandAnimal 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
