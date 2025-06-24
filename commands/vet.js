import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/vet.js'

export default async (event) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx?UnitId=078&IsTransData=1',
    )

    const bubbles = data
      // 加上距離單位，紀錄每個東西離使用者的位置多遠
      .map((value) => {
        value.distance = distance(
          value.Latitude,
          value.Longitude,
          event.message.latitude,
          event.message.longitude,
          'K',
        )
        return value
      })
      // 依照距離欄位的值排序(小到大)
      .sort((a, b) => {
        return a.distance - b.distance
      })
      // 取出前三筆
      .slice(0, 3)
      // 套用 flex 模板
      .map((value) => {
        const bubble = template()

        bubble.body.contents[0].text = value.機構名稱 || '無機構名稱'
        bubble.body.contents[1].text = value.機構地址 || '無地址資訊'
        bubble.body.contents[2].text = `距離：約 ${value.distance.toFixed(1)} 公里`

        bubble.footer.contents[0].action.uri = `tel:${value.機構電話?.replace(/[^\d]/g, '') || ''}` // 把電話號碼中所有非數字字元移除，只保留純數字
        bubble.footer.contents[0].action.label = value.機構電話 || '撥打電話'

        bubble.footer.contents[1].action.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.機構地址)}`
        bubble.footer.contents[1].action.label = 'Google地圖'

        return bubble
      })

    // 將 bubble 回傳給使用者
    await event.reply({
      type: 'flex',
      altText: '附近的動物醫院',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error('[commandVet] 錯誤:', error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
