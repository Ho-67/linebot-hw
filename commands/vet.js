import { distance } from '../utils/distance.js'
import template from '../templates/vet.js'

let preprocessedVetData = []

export const setPreprocessedData = (data) => {
  preprocessedVetData = data
  console.log('[commandVet] 已設定預處理後的動物醫院資料，筆數:', preprocessedVetData.length)
}

export default async (event) => {
  try {
    if (!preprocessedVetData || preprocessedVetData.length === 0) {
      await event.reply('動物醫院資料尚未載入，請執行 preprocessVets.js 後再試，或稍後重試。')
      console.error('[commandVet] 錯誤: 預處理後的動物醫院資料為空')
      return
    }

    const userLat = Number(event.message.latitude)
    const userLon = Number(event.message.longitude)

    if (isNaN(userLat) || isNaN(userLon)) {
      await event.reply('無效的位置資訊，請重新傳送位置或手動輸入地址。')
      console.error('[commandVet] 錯誤: 使用者位置經緯度無效')
      return
    }

    const bubbles = []

    for (const value of preprocessedVetData) {
      const lat = Number(value.Latitude)
      const lon = Number(value.Longitude)
      if (isNaN(lat) || isNaN(lon)) continue

      const dist = distance(lat, lon, userLat, userLon, 'K')
      bubbles.push({ ...value, distance: dist })
    }

    console.log(`[commandVet] 計算完成，篩選出 ${bubbles.length} 筆有距離資料的動物醫院`)

    if (bubbles.length === 0) {
      await event.reply('附近無動物醫院資料，請檢查位置或稍後再試。')
      return
    }

    const sorted = bubbles.sort((a, b) => a.distance - b.distance).slice(0, 3)

    console.log('[commandVet] 排序後，準備產生 Flex Bubble 的資料:', sorted)

    // 建立 bubble
    const flexBubbles = sorted
      .map((value) => {
        try {
          console.log('[commandVet] 產生 bubble:', value.機構名稱)
          return template(value)
        } catch (e) {
          console.warn('[commandVet] 建立 Bubble 失敗:', e)
          return null
        }
      })
      .filter(Boolean)

    if (flexBubbles.length === 0) {
      await event.reply('無法生成附近動物醫院列表，請稍後再試。')
      return
    }

    await event.reply({
      type: 'flex',
      altText: '附近的動物醫院',
      contents: {
        type: 'carousel',
        contents: flexBubbles,
      },
    })

    console.log('[commandVet] 已成功回覆用戶附近動物醫院資訊')
  } catch (error) {
    console.error('[commandVet] 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試或檢查位置資訊。')
  }
}
