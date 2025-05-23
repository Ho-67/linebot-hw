import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/animal.js'

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )

    let filtered = data

    // 先定義一個取用安全欄位的函式
    const safeText = (text) => (text ? text : '無資料')

    // 判斷事件類型：位置訊息 or postback 篩選
    if (event.message?.type === 'location') {
      // 依距離排序，取前5筆
      filtered = data
        .map((item) => {
          const lat = Number(item.Latitude)
          const lng = Number(item.Longitude)
          const userLat = event.message.latitude
          const userLng = event.message.longitude

          item.distance = distance(lat, lng, userLat, userLng, 'K')
          return item
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    } else if (type) {
      // postback 篩選
      filtered = data
        .filter((item) => {
          if (type === '狗') return item.animal_kind === '狗'
          if (type === '貓') return item.animal_kind === '貓'
          return item.animal_kind !== '狗' && item.animal_kind !== '貓'
        })
        .slice(0, 5)
    } else {
      // 若沒有條件，顯示前5筆（你也可以改成回選單或提示）
      filtered = data.slice(0, 5)
    }

    const bubbles = filtered.map((value) => {
      const bubble = template()

      // 圖片網址 fallback
      bubble.hero.url = value.album_file || 'https://via.placeholder.com/1024x720?text=No+Image'

      // 點擊後跳轉網址 fallback
      bubble.hero.action.uri =
        value.Url ||
        `https://www.google.com/maps/place/${encodeURIComponent(safeText(value.shelter_address))}`

      // 安全賦值各欄位文字
      bubble.body.contents[0].text = `認領開放狀態：${safeText(value.animal_status)}`
      bubble.body.contents[1].contents[0].contents[0].text = `品種：${safeText(value.animal_Variety)}`
      bubble.body.contents[1].contents[0].contents[1].text = `年齡：${safeText(value.animal_age)}`
      bubble.body.contents[1].contents[1].contents[0].text = `體型：${safeText(value.animal_bodytype)}`
      bubble.body.contents[1].contents[1].contents[1].text = `性別：${safeText(value.animal_sex)}`
      bubble.body.contents[2].text = `備註：${safeText(value.animal_remark)}`

      bubble.footer.contents[1].contents[0].text = value.shelter_name
      bubble.footer.contents[1].contents[1].contents[0].text = value.shelter_address
      bubble.footer.contents[1].contents[1].contents[1].text = value.shelter_tel
      bubble.footer.contents[1].contents[2].contents[0].action.uri = `https://www.google.com/maps/place/${encodeURIComponent(safeText(value.shelter_address))}`
      return bubble
    })

    // 回傳 Flex Carousel
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
