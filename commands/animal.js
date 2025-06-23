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

// 標準化（normalize）地址文字
function normalizeCity(str) {
  return (str || '').replace(/[縣市鄉鎮區]/g, '')
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

    // 如果是位置訊息，提醒使用選單查詢
    if (event.message?.type === 'location') {
      return await event.reply('目前尚無法使用位置搜尋，請使用「認領養」選單依地區選擇')
    }

    if (Array.isArray(type)) {
      const [animalType, , city, age, bodytype, sex] = type

      filtered = data.filter((item) => {
        // 品種判斷維持不變
        const kindMatch =
          animalType === '狗'
            ? item.animal_kind === '狗'
            : animalType === '貓'
              ? item.animal_kind === '貓'
              : item.animal_kind !== '狗' && item.animal_kind !== '貓'

        // 改成正規化比對地址（cityMatch）
        const cityNorm = normalizeCity(city)
        const addrNorm = normalizeCity(item.shelter_address)
        const cityMatch = city ? addrNorm.includes(cityNorm) : true

        const ageLabel = mapOrPending(item.animal_age, ageMap)
        const ageMatch = age ? ageLabel === age : true

        const bodyLabel = mapOrPending(item.animal_bodytype, bodyTypeMap)
        const bodyMatch = bodytype ? bodyLabel === bodytype : true

        const sexLabel = mapOrPending(item.animal_sex, genderMap)
        const sexMatch = sex ? sexLabel === sex : true

        // 印出 normalized 值方便確認
        console.log(`
      [commandAnimal] item ${item.animal_id}
      地址 原始: ${item.shelter_address}
      地址 Normalize 比對: '${addrNorm}' 包含 '${cityNorm}': ${cityMatch}
      品種 原始: ${item.animal_kind} → 比對結果: ${kindMatch}
      年齡 原始: ${item.animal_age} → 映射: ${ageLabel} → 比對結果: ${ageMatch}
      體型 原始: ${item.animal_bodytype} → 映射: ${bodyLabel} → 比對結果: ${bodyMatch}
      性別 原始: ${item.animal_sex} → 映射: ${sexLabel} → 比對結果: ${sexMatch}
    `)

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
