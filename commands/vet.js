import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/vet.js'
import { geocodeAddress } from '../utils/geocode.js'

export default async (event) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078&IsTransData=1',
    )

    const bubbles = []

    for (const value of data) {
      let lat = value.Latitude
      let lon = value.Longitude

      // 呼叫 geocoding API 取得經緯度
      if (!lat || !lon) {
        const geo = await geocodeAddress(value.機構地址)
        if (!geo) continue // 取不到經緯度就跳過
        lat = geo.lat
        lon = geo.lon
      }

      // 加上距離欄位
      value.distance = distance(lat, lon, event.message.latitude, event.message.longitude, 'K')

      bubbles.push(value)
    }

    const sorted = bubbles
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((value) => {
        const bubble = template()

        bubble.body.contents[0].text = value.機構名稱 || '無機構名稱'
        bubble.body.contents[1].text = value.機構地址 || '無地址資訊'
        bubble.body.contents[2].text = `距離：約 ${value.distance.toFixed(1)} 公里`

        bubble.footer.contents[0].action.uri = `tel:${value.機構電話?.replace(/[^\d]/g, '') || ''}`
        bubble.footer.contents[0].action.label = value.機構電話
          ? `撥打：${value.機構電話}`
          : '撥打電話'

        bubble.footer.contents[1].action.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.機構地址)}`
        bubble.footer.contents[1].action.label = 'Google地圖'

        return bubble
      })

    await event.reply({
      type: 'flex',
      altText: '附近的動物醫院',
      contents: {
        type: 'carousel',
        contents: sorted,
      },
    })
  } catch (error) {
    console.error('[commandVet] 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
