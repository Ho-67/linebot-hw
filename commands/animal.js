import axios from 'axios'
import { distance } from '../utils/distance.js'
import template from '../templates/animal.js'

const ageMap = {
  ADULT: '已成年',
  CHILD: '未成年',
}

const genderMap = {
  F: '母',
  M: '公',
}

const bodyTypeMap = {
  SMALL: '小',
  MEDIUM: '中',
  BIG: '大',
}

const vaccineMap = {
  T: '是',
  F: '否',
}

const sterilizationMap = {
  T: '是',
  F: '否',
}

const safeText = (text) => {
  const cleaned = String(text || '').trim()
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '無資料'
}

export default async (event, type = null) => {
  try {
    const { data } = await axios.get(
      'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL&IsTransData=1',
    )

    let filtered = data

    if (event.message?.type === 'location') {
      const userLat = event.message.latitude
      const userLng = event.message.longitude

      filtered = data
        .map((item) => {
          const lat = Number(item.Latitude)
          const lng = Number(item.Longitude)
          item.distance = distance(lat, lng, userLat, userLng, 'K')
          return item
        })
        .filter((item) => !isNaN(item.distance))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
    } else if (Array.isArray(type)) {
      const [animalType, regionBig, city, age, bodytype, sex] = type

      filtered = data
        .filter((item) => {
          // 動物種類判斷
          const kindMatch =
            animalType === '狗'
              ? item.animal_kind === '狗'
              : animalType === '貓'
                ? item.animal_kind === '貓'
                : item.animal_kind !== '狗' && item.animal_kind !== '貓'

          // 地區判斷
          const cityMatch = item.shelter_address?.includes(city)

          // 年齡判斷
          const ageMatch = ageMap[item.animal_age] === age

          // 體型判斷，map 對應中文
          const bodyMatch = bodyTypeMap[item.animal_bodytype] === bodytype

          // 性別判斷
          const sexMatch = genderMap[item.animal_sex] === sex

          return kindMatch && cityMatch && ageMatch && bodyMatch && sexMatch
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
      bubble.body.contents[1].contents[0].contents[1].text = `年齡：${ageMap[value.animal_age] || safeText(value.animal_age)}`

      bubble.body.contents[1].contents[1].contents[0].text = `體型：${bodyTypeMap[value.animal_bodytype] || safeText(value.animal_bodytype)}`
      bubble.body.contents[1].contents[1].contents[1].text = `性別：${genderMap[value.animal_sex] || safeText(value.animal_sex)}`

      bubble.body.contents[1].contents[2].contents[0].text = `施打狂犬疫苗：${vaccineMap[value.animal_bacterin] || safeText(value.animal_bacterin)}`
      bubble.body.contents[1].contents[2].contents[1].text = `絕育：${sterilizationMap[value.animal_sterilization] || safeText(value.animal_sterilization)}`

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
