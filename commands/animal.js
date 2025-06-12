import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/animal.js'

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )

    let filtered = data
    const safeText = (text) => (text ? text : '無資料')

    if (event.message?.type === 'location') {
      // 傳了位置訊息，優先用距離排序，並過濾無經緯度的項目
      filtered = data
        .map((item) => {
          const lat = Number(item.Latitude)
          const lng = Number(item.Longitude)
          const userLat = event.message.latitude
          const userLng = event.message.longitude

          item.distance = distance(lat, lng, userLat, userLng, 'K')
          return item
        })
        .filter((item) => !isNaN(item.distance)) // 過濾無效距離
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    } else if (Array.isArray(type)) {
      // 沒位置，傳入選單條件就篩選
      const [animalType, city, age] = type

      filtered = data
        .filter((item) => {
          const kindMatch =
            animalType === '狗'
              ? item.animal_kind === '狗'
              : animalType === '貓'
                ? item.animal_kind === '貓'
                : item.animal_kind !== '狗' && item.animal_kind !== '貓'

          const cityMatch = item.animal_city?.includes(city) || item.animal_place?.includes(city)
          const ageMatch =
            age === '未成年'
              ? item.animal_age?.includes('幼') || item.animal_age?.includes('小')
              : item.animal_age?.includes('成年') || item.animal_age?.includes('成')

          return kindMatch && cityMatch && ageMatch
        })
        .slice(0, 5)
    }

    if (filtered.length === 0) {
      return await event.reply('抱歉，目前附近沒有找到可領養的動物')
    }

    const bubbles = filtered.map((value) => {
      const bubble = template()

      const imageUrl = value.album_file || 'https://via.placeholder.com/1024x720?text=No+Image'
      bubble.hero.url = imageUrl
      bubble.hero.action = {
        type: 'uri',
        label: '放大圖片',
        uri: imageUrl,
      }

      bubble.body.contents[0].text = `收容編號：${safeText(value.animal_subid)}`

      bubble.body.contents[1].contents[0].contents[0].text = `品種：${safeText(value.animal_Variety)}`
      bubble.body.contents[1].contents[0].contents[1].text = `年齡：${safeText(value.animal_age)}`

      bubble.body.contents[1].contents[1].contents[0].text = `體型：${safeText(value.animal_bodytype)}`
      bubble.body.contents[1].contents[1].contents[1].text = `性別：${safeText(value.animal_sex)}`

      bubble.body.contents[1].contents[2].contents[0].text = `是否施打疫苗：${safeText(value.animal_bacterin)}`
      bubble.body.contents[1].contents[2].contents[1].text = `絕育：${safeText(value.animal_sterilization)}`

      bubble.body.contents[2].text = `備註：${safeText(value.animal_remark)}`

      bubble.footer.contents[1].contents[0].text = safeText(value.shelter_name)
      bubble.footer.contents[1].contents[1].contents[0].text = safeText(value.shelter_address)
      bubble.footer.contents[1].contents[1].contents[1].text = safeText(value.shelter_tel)

      bubble.footer.contents[1].contents[2].contents[0].action = {
        type: 'uri',
        label: 'Google地圖',
        uri: `https://www.google.com/maps/place/${encodeURIComponent(safeText(value.shelter_address))}`,
      }

      return bubble
    })

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
