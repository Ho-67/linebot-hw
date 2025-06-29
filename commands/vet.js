import { distance } from '../utils/distance.js'
import template from '../templates/vet.js'
import { validateAndFixLocation } from '../utils/geocode.js'

let preprocessedVetData = []

export const setPreprocessedData = (data) => {
  preprocessedVetData = data
  console.log('[commandVet] 已設定預處理後的動物醫院資料，筆數:', preprocessedVetData.length)
}

export default async (event) => {
  try {
    if (!preprocessedVetData || preprocessedVetData.length === 0) {
      await event.reply('動物醫院資料尚未載入，請稍後再試。')
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

    // ===== 新增：校正位置並取得縣市與鄉鎮 =====
    const userLocation = await validateAndFixLocation({ lat: userLat, lon: userLon })
    if (!userLocation) {
      await event.reply('無法辨識您的位置，請重新傳送位置或手動輸入地址。')
      return
    }
    const { city: userCity, district: userDistrict, lat: fixedLat, lon: fixedLon } = userLocation

    const bubbles = []

    // 只挑縣市鄉鎮相符的資料，減少錯誤結果
    for (const value of preprocessedVetData) {
      const lat = Number(value.Latitude)
      const lon = Number(value.Longitude)
      if (isNaN(lat) || isNaN(lon)) continue

      // 先用關鍵字過濾縣市、鄉鎮 (你資料欄位名稱調整)
      if (value.縣市 !== userCity) continue
      if (value.鄉鎮 !== userDistrict) continue

      const dist = distance(lat, lon, fixedLat, fixedLon, 'K')
      bubbles.push({ ...value, distance: dist })
    }

    console.log(`[commandVet] 計算完成，篩選出 ${bubbles.length} 筆有距離資料的動物醫院`)

    if (bubbles.length === 0) {
      await event.reply('附近無符合條件的動物醫院資料，請稍後再試。')
      return
    }

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

          bubble.footer.contents[1].action.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.機構名稱)}`
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
      await event.reply('無法生成附近動物醫院列表，請稍後再試。')
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
    await event.reply('發生錯誤，請稍後再試或檢查位置資訊。')
  }
}
