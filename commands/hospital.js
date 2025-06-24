import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/hospital.js'

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
        const address = value.City + value.Town + value.Address
        const bubble = template()

        // 填入基本資料
        bubble.header.contents[0].text = value.OrgName || '機構名稱'
        bubble.header.contents[1].text = value.Tel || '無電話'
        bubble.header.contents[2].text = value.Address || '無地址'
        bubble.header.contents[3].text = `距離 ${value.distance.toFixed(1)} 公里`

        // 設定按鈕：Google 地圖 + 撥打電話
        bubble.body.contents[0].action.uri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        bubble.body.contents[1].action.uri = `tel:${(value.Tel || '').replace(/\s/g, '')}`

        return bubble
      })

    // 回傳 Flex Carousel
    await event.reply({
      type: 'flex',
      altText: '附近的動物醫院',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    })
  } catch (error) {
    console.error(error)
    await event.reply('發生錯誤，請稍後再試')
  }
}
