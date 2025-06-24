import axios from 'axios'
import template from '../templates/animal.js'

const ageMap = { ADULT: '已成年', CHILD: '未成年' }
const genderMap = { F: '母', M: '公' }
const bodyTypeMap = { SMALL: '小', MEDIUM: '中', BIG: '大' }

// 加入 N 代號轉「待確認」的映射函式
function mapOrPending(value, map) {
  if (!value || value === 'N') return '待確認'
  return map[value] || '待確認'
}

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
    console.log('[commandAnimal] 取得資料筆數:', data.length)

    let filtered = data

    if (Array.isArray(type)) {
      console.log('[commandAnimal] 篩選條件 (type array):', type)
      const [animalType, , city, age, bodytype, sex] = type // regionBig 不用

      filtered = data.filter((item) => {
        // 判斷品種
        const kindMatch =
          animalType === '狗'
            ? item.animal_kind === '狗'
            : animalType === '貓'
              ? item.animal_kind === '貓'
              : item.animal_kind !== '狗' && item.animal_kind !== '貓'

        // 判斷縣市
        const cityMatch = city ? item.shelter_address?.includes(city) : true

        // 年齡映射 + 比對（包含 N 代號）
        const ageLabel = mapOrPending(item.animal_age, ageMap)
        const ageMatch = age ? ageLabel === age : true

        // 體型映射 + 比對
        const bodyLabel = mapOrPending(item.animal_bodytype, bodyTypeMap)
        const bodyMatch = bodytype ? bodyLabel === bodytype : true

        // 性別映射 + 比對
        const sexLabel = mapOrPending(item.animal_sex, genderMap)
        const sexMatch = sex ? sexLabel === sex : true

        // console.log(`
        //   [commandAnimal] item ${item.animal_id}
        //   地址=${item.shelter_address}
        //   品種 原始: ${item.animal_kind} → 比對結果: ${kindMatch}
        //   縣市 是否包含 '${city}': ${cityMatch}
        //   年齡 原始: ${item.animal_age} → 映射: ${ageLabel} → 比對結果: ${ageMatch}
        //   體型 原始: ${item.animal_bodytype} → 映射: ${bodyLabel} → 比對結果: ${bodyMatch}
        //   性別 原始: ${item.animal_sex} → 映射: ${sexLabel} → 比對結果: ${sexMatch}
        // `)

        return kindMatch && cityMatch && ageMatch && bodyMatch && sexMatch
      })

      console.log('[commandAnimal] 篩選後筆數:', filtered.length)

      // 隨機抽五筆
      filtered = shuffleArray(filtered).slice(0, 5)
      console.log('[commandAnimal] 隨機抽取後筆數:', filtered.length)
    }

    if (filtered.length === 0) {
      return await event.reply('抱歉，目前沒有找到符合條件的動物')
    }

    const bubbles = filtered
      .map((value) => {
        try {
          return template(value)
        } catch (e) {
          console.error('[commandAnimal] Flex Bubble 產生錯誤：', e, value)
          return null
        }
      })
      .filter(Boolean)

    if (bubbles.length === 0) {
      return await event.reply('目前有符合條件的資料，但 Flex 格式產生失敗！')
    } else if (bubbles.length > 0) {
      console.log('[commandAnimal] 第一個 Flex Bubble 內容:', JSON.stringify(bubbles[0], null, 2))
    }

    console.log('[commandAnimal] Flex bubbles 數量:', bubbles.length)

    await event.reply({
      type: 'flex',
      altText: '認領養動物列表',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error('[commandAnimal] 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
