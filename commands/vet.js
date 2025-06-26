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
      await event.reply('動物醫院資料尚未載入或載入失敗，請稍後再試')
      console.error('[commandVet] 錯誤: 預處理後的動物醫院資料為空')
      return
    }

    const userLat = Number(event.message.latitude)
    const userLon = Number(event.message.longitude)

    if (isNaN(userLat) || isNaN(userLon)) {
      await event.reply('無效的位置資訊，請重新傳送位置')
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

    const sorted = bubbles
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((value) => {
        try {
          const bubble = template()

          bubble.body.contents[0].text = value.機構名稱
          bubble.body.contents[1].text = value.機構地址
          bubble.body.contents[2].text = `距離：約 ${value.distance.toFixed(1)} 公里`

          bubble.footer.contents[0].action.uri = `tel:${value.機構電話?.replace(/[^\d]/g, '') || ''}`
          bubble.footer.contents[0].action.label = value.機構電話
            ? `撥打：${value.機構電話}`
            : '撥打電話'

          bubble.footer.contents[1].action.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.機構地址)}`
          bubble.footer.contents[1].action.label = 'Google地圖'

          return bubble
        } catch (e) {
          console.warn('[commandVet] 建立 Bubble 失敗，略過此筆:', e)
          return null
        }
      })
      .filter(Boolean)

    console.log(`[commandVet] 產生 Flex Bubble，共 ${sorted.length} 筆`)

    if (sorted.length === 0) {
      await event.reply('找不到附近的動物醫院，請稍後再試')
      return
    }

    await event.reply({
      type: 'flex',
      altText: '附近的動物醫院',
      contents: {
        type: 'carousel',
        contents: sorted,
      },
    })
    console.log('[commandVet] 已成功回覆用戶附近動物醫院資訊')
  } catch (error) {
    console.error('[commandVet] 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
