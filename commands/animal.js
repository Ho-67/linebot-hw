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
  是: 'T',
  否: 'F',
}

const sterilizationMap = {
  是: 'T',
  否: 'F',
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
      const [animalType, regionBig, city, age, bodytype, sex, vaccine, sterilization] = type

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

          // 體型判斷
          const bodyMatch = bodyTypeMap[item.animal_bodytype] === bodytype

          // 性別判斷
          const sexMatch = genderMap[item.animal_sex] === sex

          // 施打疫苗判斷
          const vaccineMatch = vaccine ? item.animal_bacterin === vaccineMap[vaccine] : true

          // 絕育判斷
          const sterilizationMatch = sterilization
            ? item.animal_sterilization === sterilizationMap[sterilization]
            : true

          return (
            kindMatch &&
            cityMatch &&
            ageMatch &&
            bodyMatch &&
            sexMatch &&
            vaccineMatch &&
            sterilizationMatch
          )
        })
        .slice(0, 5)
    }

    if (filtered.length === 0) {
      return await event.reply('抱歉，目前沒有找到符合條件的動物')
    }

    const bubbles = filtered.map((value) => template(value))

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
